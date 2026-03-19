'use strict';
/**
 * src/main/services/deployEngine.js
 * Migrated from: deployEngine.js (legacy root)
 *
 * Deploy Pipeline Engine for Zevitsoft Deployment Manager v2.
 *
 * Exports:
 *   deployPm2(opts)        — 8-step PM2 deploy pipeline
 *   deployStatic(opts)     — 8-step static deploy pipeline
 *   deployCloudflare(opts) — 5-step Cloudflare Worker/Pages deploy pipeline
 *
 * No internal imports changed from legacy — only the file location moved.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const archiver = require('archiver');

// ─── PM2 Deploy Steps (indices 0-7) ──────────────────────────────────────────
const PM2_STEPS = [
    'Validate',          // 0
    'Change Directory',  // 1
    'Git Pull',          // 2
    'npm Install',       // 3
    'Build',             // 4
    'PM2 Restart',       // 5
    'Verify',            // 6
    'Complete',          // 7
];

// ─── Static Deploy Steps (indices 0-7) ───────────────────────────────────────
const STATIC_STEPS = [
    'Validate',          // 0
    'Local Build',       // 1
    'Zip dist',          // 2
    'SFTP Upload',       // 3
    'Backup Files',      // 4
    'Extract',           // 5
    'Cleanup',           // 6
    'Complete',          // 7
];

// ─── Cloudflare Deploy Steps (indices 0-4) ───────────────────────────────────
const CF_STEPS = [
    'Validate',          // 0
    'npm Install',       // 1
    'Build',             // 2
    'Wrangler Deploy',   // 3
    'Complete',          // 4
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a sudo command prefix.
 * - No password: `sudo`
 * - With password: `echo '<escaped_password>' | sudo -S`
 */
function _sudoPrefix(sudoPassword) {
    if (!sudoPassword) return 'sudo';
    const escaped = sudoPassword.replace(/'/g, "'\\''")
    return `echo '${escaped}' | sudo -S`;
}

/**
 * Wrap a shell command with sudo (optionally password-piped).
 */
function sudoWrap(cmd, sudoPassword) {
    const prefix = _sudoPrefix(sudoPassword);
    return `${prefix} ${cmd}`;
}

/**
 * Run a local shell command (Windows) and stream stdout+stderr line by line.
 * @returns {Promise<{code: number}>}
 */
function localExecStream(cmd, cwd, onData) {
    return new Promise((resolve) => {
        const child = exec(cmd, { cwd, windowsHide: true });
        let buffer = '';

        const dispatch = (chunk) => {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (onData) onData(line + '\n');
            }
        };

        child.stdout.on('data', dispatch);
        child.stderr.on('data', dispatch);

        child.on('close', (code) => {
            if (buffer && onData) onData(buffer);
            resolve({ code: code ?? 0 });
        });

        child.on('error', (err) => {
            if (onData) onData(`[ERROR] ${err.message}\n`);
            resolve({ code: 1 });
        });
    });
}

/**
 * Create a zip archive from a directory.
 */
function zipDirectory(sourceDir, outPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outPath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        let fileCount = 0;
        let totalBytes = 0;

        archive.on('entry', (entry) => {
            if (!entry.stats?.isDirectory()) {
                fileCount++;
                totalBytes += entry.stats?.size ?? 0;
            }
        });

        output.on('close', () => resolve({ fileCount, totalBytes: archive.pointer() }));
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

/**
 * Mask the git token in any log line.
 */
function maskToken(line, token) {
    if (!token) return line;
    return line.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***');
}

// ─── PM2 Deploy Pipeline ──────────────────────────────────────────────────────

/**
 * deployPm2() — 8-step PM2 deployment pipeline.
 */
async function deployPm2({ serverId, project, git, sshManager, sendLog, sendProgress, isAborted, skipSteps = [], customCommands = {} }) {
    const token = git?.token ?? '';

    const log = (line) => sendLog(maskToken(line, token));
    const step = (idx, status, label) => sendProgress(idx, status, label ?? PM2_STEPS[idx]);
    const getCmd = (idx, defaultCmd) => customCommands[idx] ?? defaultCmd;
    const abort = (idx, msg) => {
        step(idx, 'failed', msg);
        log(`❌ Deploy aborted: ${msg}`);
        return { ok: false, error: msg };
    };
    const shouldSkip = (idx) => skipSteps.includes(idx);

    let md5Before = null;

    // ── Step 0: Validate ──────────────────────────────────────────────────────
    step(0, 'running');

    if (!sshManager.isConnected(serverId)) {
        return abort(0, 'Server not connected. Connect to SSH first.');
    }
    if (!git?.username || !git?.token) {
        return abort(0, 'Git credentials not configured. Set them in ⚙️ Git Config.');
    }
    if (!project?.remotePath || !project?.repo) {
        return abort(0, 'Project is missing remotePath or repo. Edit the project config.');
    }

    if (isAborted()) return abort(0, 'Deploy cancelled by user.');
    step(0, 'success');

    // ── Step 1: Change Directory ──────────────────────────────────────────────
    if (shouldSkip(1)) {
        log('⏭️ Skipping: Change Directory');
        step(1, 'success', 'Change Directory (skipped)');
    } else {
        step(1, 'running');
        log(`📂 Checking directory: ${project.remotePath}`);

        const cdResult = await sshManager.exec(serverId, `cd "${project.remotePath}" && echo "OK"`);
        if (cdResult.code !== 0 || !cdResult.stdout.includes('OK')) {
            return abort(1, `Directory not found on server: ${project.remotePath}`);
        }

        if (isAborted()) return abort(1, 'Deploy cancelled by user.');
        step(1, 'success');
    }

    // ── Step 2: Git Pull ──────────────────────────────────────────────────────
    if (shouldSkip(2)) {
        log('⏭️ Skipping: Git Pull');
        step(2, 'success', 'Git Pull (skipped)');
    } else {
        step(2, 'running');

        const hashBefore = await sshManager.exec(
            serverId,
            `cd "${project.remotePath}" && cat package-lock.json 2>/dev/null | md5sum || echo "NONE"`
        );
        md5Before = hashBefore.stdout.trim().split(' ')[0];
        log(`🔑 package-lock.json hash before pull: ${md5Before}`);

        const repo = project.repo.replace(/^https?:\/\//, '');
        const gitUrl = `https://${git.username}:${token}@${repo}`;
        const branch = project.branch || 'main';
        const defaultGitCmdSimple = `git pull origin ${branch}`;
        const defaultGitCmdFull = `git pull "${gitUrl}" "${branch}"`;

        let finalGitCmd;
        const customGitCmd = customCommands[2];
        if (customGitCmd && customGitCmd !== defaultGitCmdSimple) {
            finalGitCmd = customGitCmd.replace(defaultGitCmdSimple, defaultGitCmdFull);
            if (finalGitCmd === customGitCmd && !customGitCmd.includes(repo)) {
                finalGitCmd = customGitCmd;
            }
        } else {
            finalGitCmd = defaultGitCmdFull;
        }
        const gitCmd = `cd "${project.remotePath}" && ${finalGitCmd}`;

        log(`🔀 git pull ${maskToken(gitUrl, token)} ${branch}`);

        let pullFailed = false;
        const pullResult = await sshManager.execStream(serverId, gitCmd, (line) => {
            log(line.trimEnd());
        });

        if (pullResult.code !== 0) {
            pullFailed = true;
        }

        if (isAborted()) return abort(2, 'Deploy cancelled by user.');
        if (pullFailed) return abort(2, 'git pull failed. Check branch name, repo URL, and credentials.');
        step(2, 'success');
    }

    // ── Step 3: npm Install (smart) ───────────────────────────────────────────
    if (shouldSkip(3)) {
        log('⏭️ Skipping: npm Install');
        step(3, 'success', 'npm Install (skipped)');
    } else {
        step(3, 'running');

        const hashAfter = await sshManager.exec(
            serverId,
            `cd "${project.remotePath}" && cat package-lock.json 2>/dev/null | md5sum || echo "NONE"`
        );
        const md5After = hashAfter.stdout.trim().split(' ')[0];
        log(`🔑 package-lock.json hash after pull: ${md5After}`);

        if (md5Before !== md5After || md5Before === 'NONE') {
            const npmCmd = getCmd(3, 'npm install --production');
            log(`📦 Dependencies changed — running ${npmCmd}...`);
            const installResult = await sshManager.execStream(
                serverId,
                `cd "${project.remotePath}" && ${npmCmd}`,
                (line) => log(line.trimEnd())
            );
            if (installResult.code !== 0) {
                return abort(3, 'npm install failed. Check server logs above.');
            }
        } else {
            log('✅ Dependencies unchanged — skipping npm install.');
        }

        if (isAborted()) return abort(3, 'Deploy cancelled by user.');
        step(3, 'success');
    }

    // ── Step 4: Build ─────────────────────────────────────────────────────────
    if (shouldSkip(4)) {
        log('⏭️ Skipping: Build');
        step(4, 'success', 'Build (skipped)');
    } else {
        step(4, 'running');

        if (project.buildCommand && project.buildCommand.trim()) {
            const buildCmd = getCmd(4, project.buildCommand);
            log(`🔨 Building: ${buildCmd}`);
            const buildResult = await sshManager.execStream(
                serverId,
                `cd "${project.remotePath}" && ${buildCmd}`,
                (line) => log(line.trimEnd())
            );
            if (buildResult.code !== 0) {
                return abort(4, `Build command failed: ${project.buildCommand}`);
            }
            if (isAborted()) return abort(4, 'Deploy cancelled by user.');
        } else {
            log('⏭️ No build command configured — skipping build.');
        }
        step(4, 'success');
    }

    // ── Step 5: PM2 Restart ───────────────────────────────────────────────────
    if (shouldSkip(5)) {
        log('⏭️ Skipping: PM2 Restart');
        step(5, 'success', 'PM2 Restart (skipped)');
    } else {
        step(5, 'running');

        const pm2Config = project.pm2Config || 'ecosystem.config.js';
        const pm2Cmd = getCmd(5, `pm2 restart "${pm2Config}"`);
        log(`♻️ ${pm2Cmd}...`);

        const restartResult = await sshManager.exec(
            serverId,
            `cd "${project.remotePath}" && ${pm2Cmd}`
        );

        if (restartResult.code !== 0) {
            log('⚠️ pm2 restart failed, trying pm2 start...');
            const startResult = await sshManager.exec(
                serverId,
                `cd "${project.remotePath}" && pm2 start "${pm2Config}"`
            );
            if (startResult.code !== 0) {
                return abort(5, `pm2 restart/start failed. Is PM2 installed on the server?`);
            }
        }

        if (restartResult.stdout) log(restartResult.stdout);
        if (isAborted()) return abort(5, 'Deploy cancelled by user.');
        step(5, 'success');
    }

    // ── Step 6: Verify via pm2 jlist ─────────────────────────────────────────
    let pm2Processes = [];
    if (shouldSkip(6)) {
        log('⏭️ Skipping: Verify');
        step(6, 'success', 'Verify (skipped)');
    } else {
        step(6, 'running');

        const jlistResult = await sshManager.exec(serverId, 'pm2 jlist');
        try {
            pm2Processes = JSON.parse(jlistResult.stdout || '[]');
            const appName = path.basename(project.remotePath);
            const matching = pm2Processes.filter(p =>
                p.pm2_env?.status === 'online' &&
                (p.name?.includes(appName) || p.pm2_env?.pm_cwd === project.remotePath)
            );
            log(`✅ PM2 verified: ${pm2Processes.length} process(es) total, ${matching.length} online.`);
        } catch {
            log('⚠️ Could not parse pm2 jlist output — deploy may still be OK.');
        }

        if (isAborted()) return abort(6, 'Deploy cancelled by user.');
        step(6, 'success');
    }

    // ── Step 7: Complete ──────────────────────────────────────────────────────
    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    log(`🚀 Deploy complete at ${ts}`);
    step(7, 'success', 'Complete');

    return { ok: true, pm2Processes };
}

// ─── Static Deploy Pipeline ───────────────────────────────────────────────────

/**
 * deployStatic() — 8-step Static site deployment pipeline.
 */
async function deployStatic({ serverId, project, git, sshManager, sendLog, sendProgress, sendUploadProgress, isAborted, sudoPassword, useSudo, skipSteps = [], customCommands = {} }) {
    const log = (line) => sendLog(line);
    const step = (idx, status, label) => sendProgress(idx, status, label ?? STATIC_STEPS[idx]);
    const abort = (idx, msg) => {
        step(idx, 'failed', msg);
        log(`❌ Deploy aborted: ${msg}`);
        return { ok: false, error: msg };
    };
    const shouldSkip = (idx) => skipSteps.includes(idx);

    const sudoExec = (cmd) => sshManager.exec(serverId, useSudo ? sudoWrap(cmd, sudoPassword || '') : cmd);
    const sudoLog = useSudo ? ' (with sudo)' : '';
    if (useSudo) log(`🔐 Sudo enabled — privileged file operations active${sudoPassword ? '' : ' (NOPASSWD)'}.`);

    const localZipPath = path.join(os.tmpdir(), `deploy_${project.id ?? Date.now()}.zip`);
    const remoteZip = '/tmp/deploy_package.zip';

    // ── Step 0: Validate ──────────────────────────────────────────────────────
    step(0, 'running');

    if (!sshManager.isConnected(serverId)) {
        return abort(0, 'Server not connected. Connect to SSH first.');
    }
    if (!project?.localPath) {
        return abort(0, 'Project localPath is not configured.');
    }
    if (!project?.webRoot) {
        return abort(0, 'Project webRoot (remote path) is not configured.');
    }

    const distFolder = project.distFolder || 'dist';
    const distPath = path.join(project.localPath, distFolder);

    if (!fs.existsSync(project.localPath)) {
        return abort(0, `Local project path does not exist: ${project.localPath}`);
    }

    if (isAborted()) return abort(0, 'Deploy cancelled by user.');
    step(0, 'success');

    // ── Step 1: Local Build ───────────────────────────────────────────────────
    if (shouldSkip(1)) {
        log('⏭️ Skipping: Local Build');
        step(1, 'success', 'Local Build (skipped)');
    } else {
        step(1, 'running');

        if (project.buildCommand && project.buildCommand.trim()) {
            const buildCmd = customCommands[1] ?? project.buildCommand;
            log(`🔨 Building locally: ${buildCmd}`);
            log(`📁 Working directory: ${project.localPath}`);

            const buildResult = await localExecStream(
                buildCmd,
                project.localPath,
                (line) => log(line.trimEnd())
            );

            if (buildResult.code !== 0) {
                return abort(1, `Build failed (exit code ${buildResult.code}). Check the log above.`);
            }

            if (!fs.existsSync(distPath)) {
                return abort(1, `Build completed but dist folder not found: ${distPath}`);
            }
        } else {
            if (!fs.existsSync(distPath)) {
                return abort(1, `Dist folder not found: ${distPath} — configure a buildCommand or ensure dist exists.`);
            }
            log(`⏭️ No build command — using existing dist folder: ${distPath}`);
        }

        if (isAborted()) return abort(1, 'Deploy cancelled by user.');
        step(1, 'success');
    }

    // ── Step 2: Zip dist folder ───────────────────────────────────────────────
    if (shouldSkip(2)) {
        log('⏭️ Skipping: Zip dist');
        step(2, 'success', 'Zip dist (skipped)');
    } else {
        step(2, 'running');
        log(`🗜️ Compressing ${distPath} → ${localZipPath}`);

        let zipStats;
        try {
            zipStats = await zipDirectory(distPath, localZipPath);
            const sizeMB = (zipStats.totalBytes / 1024 / 1024).toFixed(2);
            log(`✅ Compressed ${zipStats.fileCount} files → ${sizeMB} MB`);
        } catch (err) {
            return abort(2, `Failed to create zip archive: ${err.message}`);
        }

        if (isAborted()) {
            try { fs.unlinkSync(localZipPath); } catch (_) { }
            return abort(2, 'Deploy cancelled by user.');
        }
        step(2, 'success');
    }

    // ── Step 3: SFTP Upload ───────────────────────────────────────────────────
    if (shouldSkip(3)) {
        log('⏭️ Skipping: SFTP Upload');
        step(3, 'success', 'SFTP Upload (skipped)');
    } else {
        step(3, 'running');
        log(`📤 Uploading ${localZipPath} → ${remoteZip}`);

        try {
            await sshManager.sftpUpload(serverId, localZipPath, remoteZip, (transferred, total) => {
                sendUploadProgress(transferred, total);
            });
            log(`✅ Upload complete`);
        } catch (err) {
            try { fs.unlinkSync(localZipPath); } catch (_) { }
            return abort(3, `SFTP upload failed: ${err.message}`);
        }

        if (isAborted()) {
            try { await sshManager.exec(serverId, `rm -f ${remoteZip}`); } catch (_) { }
            try { fs.unlinkSync(localZipPath); } catch (_) { }
            return abort(3, 'Deploy cancelled by user.');
        }
        step(3, 'success');
    }

    // ── Step 4: Backup old files ──────────────────────────────────────────────
    if (shouldSkip(4)) {
        log('⏭️ Skipping: Backup Files');
        step(4, 'success', 'Backup Files (skipped)');
    } else {
        step(4, 'running');

        if (project.backup) {
            const bakPath = `${project.webRoot}.bak`;
            log(`💾 Backing up ${project.webRoot} → ${bakPath}${sudoLog}`);
            await sudoExec(`rm -rf "${bakPath}"`);
            await sudoExec(`mv "${project.webRoot}" "${bakPath}"`);
            log(`✅ Backup created at ${bakPath}`);
        } else {
            log(`🗑️ Removing old files from ${project.webRoot}${sudoLog}`);
            const rmResult = await sudoExec(`rm -rf "${project.webRoot}/"*`);
            if (rmResult.code !== 0) {
                log(`⚠️ rm returned non-zero (may be OK if folder is already empty): ${rmResult.stderr || rmResult.stdout}`);
            }
        }

        if (isAborted()) return abort(4, 'Deploy cancelled by user.');
        step(4, 'success');
    }

    // ── Step 5: Extract on server ─────────────────────────────────────────────
    if (shouldSkip(5)) {
        log('⏭️ Skipping: Extract');
        step(5, 'success', 'Extract (skipped)');
    } else {
        step(5, 'running');
        const extractCmd = customCommands[5] ?? `unzip -o "${remoteZip}" -d "${project.webRoot}/" 2>&1`;
        log(`📦 Extracting ${remoteZip} → ${project.webRoot}${sudoLog}`);

        await sudoExec(`mkdir -p "${project.webRoot}"`);

        const extractResult = await sudoExec(extractCmd);

        if (extractResult.code !== 0) {
            const whichUnzip = await sshManager.exec(serverId, 'which unzip 2>/dev/null || echo "NOT_FOUND"');
            if (whichUnzip.stdout.includes('NOT_FOUND')) {
                return abort(5, 'unzip is not installed on the server. Run: apt install unzip');
            }
            return abort(5, `Extract failed: ${extractResult.stderr || extractResult.stdout || 'unknown error'}`);
        }

        const extractedLines = extractResult.stdout.split('\n').length;
        log(`✅ Extracted ${extractedLines} items to ${project.webRoot}`);

        if (isAborted()) return abort(5, 'Deploy cancelled by user.');
        step(5, 'success');
    }

    // ── Step 6: Cleanup ───────────────────────────────────────────────────────
    if (shouldSkip(6)) {
        log('⏭️ Skipping: Cleanup');
        step(6, 'success', 'Cleanup (skipped)');
    } else {
        step(6, 'running');

        try {
            await sshManager.exec(serverId, `rm -f "${remoteZip}"`);
            log(`🧹 Removed remote zip: ${remoteZip}`);
        } catch (_) { /* non-critical */ }

        try {
            fs.unlinkSync(localZipPath);
            log(`🧹 Removed local zip: ${localZipPath}`);
        } catch (_) { /* non-critical */ }

        step(6, 'success');
    }

    // ── Step 7: Complete ──────────────────────────────────────────────────────
    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    log(`🚀 Static deploy complete at ${ts}`);
    log(`   Deployed to: ${project.webRoot}`);
    step(7, 'success', 'Complete');

    return { ok: true };
}

// ─── Cloudflare Deploy Pipeline ───────────────────────────────────────────────

async function deployCloudflare(opts) {
    const { project, sendLog, sendProgress, isAborted, skipSteps = [], customCommands = {} } = opts;

    const log = (msg, token) => sendLog(`[CF] ${msg}`, token);
    const step = (idx, status, label) => sendProgress(idx, status, label || CF_STEPS[idx]);

    const abort = (idx, reason) => {
        log(`❌ Deploy aborted at step ${CF_STEPS[idx]}: ${reason}`, 'error');
        step(idx, 'failed');
        return { ok: false, error: reason };
    };
    const shouldSkip = (idx) => skipSteps.includes(idx);

    // ── Step 0: Validate ────────────────────────────────────────────────────────
    step(0, 'running');
    log(`Validating Cloudflare configuration...`);
    if (!project.localPath) return abort(0, 'Local path is required.');
    if (!fs.existsSync(project.localPath)) {
        return abort(0, `Local path not found: ${project.localPath}`);
    }

    if (isAborted()) return abort(0, 'Deploy cancelled by user.');
    step(0, 'success');

    // ── Step 1: npm Install ─────────────────────────────────────────────────────
    if (shouldSkip(1)) {
        log('⏭️ Skipping: npm Install');
        step(1, 'success', 'npm Install (skipped)');
    } else {
        step(1, 'running');
        const npmCmd = customCommands[1] ?? 'npm install --legacy-peer-deps';
        log(`Running: ${npmCmd}...`);
        const installResult = await localExecStream(
            npmCmd,
            project.localPath,
            (data) => log(data)
        );

        if (installResult.code !== 0) {
            log(`⚠️ npm install exited with code ${installResult.code}. Continuing anyway...`);
        }

        if (isAborted()) return abort(1, 'Deploy cancelled by user.');
        step(1, 'success');
    }

    // ── Step 2: Build ───────────────────────────────────────────────────────────
    if (shouldSkip(2)) {
        log('⏭️ Skipping: Build');
        step(2, 'success', 'Build (skipped)');
    } else {
        step(2, 'running');
        const buildCmd = customCommands[2] ?? project.buildCommand;
        if (buildCmd) {
            log(`Running build command: ${buildCmd}`);
            const buildResult = await localExecStream(
                buildCmd,
                project.localPath,
                (data) => log(data)
            );

            if (buildResult.code !== 0) {
                return abort(2, `Build failed (exit code ${buildResult.code}). Check the log above.`);
            }
        } else {
            log(`⏭️ No build command specified. Skipping.`);
        }

        if (isAborted()) return abort(2, 'Deploy cancelled by user.');
        step(2, 'success');
    }

    // ── Step 3: Wrangler Deploy ─────────────────────────────────────────────────
    if (shouldSkip(3)) {
        log('⏭️ Skipping: Wrangler Deploy');
        step(3, 'success', 'Wrangler Deploy (skipped)');
    } else {
        step(3, 'running');

        let cmd = '';
        if (customCommands[3]) {
            cmd = customCommands[3];
        } else if (project.type === 'cf-pages') {
            const destDir = project.distFolder || 'dist';
            const fullDistPath = path.isAbsolute(destDir) ? destDir : path.join(project.localPath, destDir);

            if (!fs.existsSync(fullDistPath)) {
                return abort(3, `Output directory not found: ${fullDistPath}`);
            }

            cmd = `npx wrangler pages deploy "${destDir}"`;
            if (project.cfProjectName) {
                cmd += ` --project-name "${project.cfProjectName}"`;
            }
        } else {
            cmd = `npx wrangler deploy`;
        }

        log(`Running Cloudflare deploy: ${cmd}`);

        const wranglerResult = await localExecStream(
            cmd,
            project.localPath,
            (data) => log(data)
        );

        if (wranglerResult.code !== 0) {
            return abort(3, `Wrangler deploy failed (exit code ${wranglerResult.code}). Ensure you have wrangler installed and authenticated.`);
        }

        if (isAborted()) return abort(3, 'Deploy cancelled by user.');
        step(3, 'success');
    }

    // ── Step 4: Complete ────────────────────────────────────────────────────────
    const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    log(`🚀 Cloudflare deploy complete at ${ts}`);
    step(4, 'success', 'Complete');

    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = { deployPm2, deployStatic, deployCloudflare };
