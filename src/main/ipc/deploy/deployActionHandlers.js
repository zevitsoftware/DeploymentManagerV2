'use strict';
/**
 * ipc/deploy/deployActionHandlers.js
 *
 * IPC handlers for deploy execution, PM2 management, server health metrics,
 * security scan, access log summary, process list, and AI analysis.
 */

const { readFullConfig } = require('../../services/configStore');
const { resolveServer, resolveProject, maskToken } = require('./deployConfigHandlers');
const ch = require('../../../shared/channels');

function registerHandlers(ipcMain, win, sshManager) {

    // Keep track of active deploy (for cancel support)
    let activeDeployAbort = null;

    // ── Helper: send IPC events to renderer ──────────────────────────────────

    /** Stream a log line to the renderer's deploy log panel */
    function sendLog(line, token) {
        if (!win || win.isDestroyed()) return;
        const masked = maskToken(line, token);
        win.webContents.send(ch.EVT_DEPLOY_LOG, masked);
    }

    /** Update a deploy pipeline step status */
    function sendProgress(stepIndex, status, label) {
        if (!win || win.isDestroyed()) return;
        win.webContents.send(ch.EVT_DEPLOY_PROGRESS, { stepIndex, status, label });
    }

    /** Send file upload progress */
    function sendUploadProgress(transferred, total) {
        if (!win || win.isDestroyed()) return;
        win.webContents.send(ch.EVT_UPLOAD_PROGRESS, { transferred, total });
    }

    // ── Deploy IPC Handlers ──────────────────────────────────────────────────

    ipcMain.handle('deploy:run-deploy', async (e, serverId, projectId, skipSteps, customCommands) => {
        try {
            const { deployPm2, deployStatic, deployCloudflare } = require('../../services/deployEngine');
            const project = resolveProject(serverId, projectId);
            if (!project) return { ok: false, error: `Project ${projectId} not found.` };

            const { getGitConfig } = require('../../services/configStore');
            const git = getGitConfig();

            if (activeDeployAbort) {
                return { ok: false, error: 'A deploy is already running. Cancel it first.' };
            }

            let aborted = false;
            activeDeployAbort = () => { aborted = true; };

            const server = resolveServer(serverId);
            const opts = {
                serverId,
                project,
                git,
                sshManager,
                sendLog,
                sendProgress,
                sendUploadProgress,
                isAborted: () => aborted,
                sudoPassword: server?.sudoPassword ?? '',
                useSudo: server?.useSudo === true,
                skipSteps: skipSteps ?? [],
                customCommands: customCommands ?? {},
            };

            let result;
            if (project.type === 'pm2') {
                result = await deployPm2(opts);
            } else if (project.type === 'static') {
                result = await deployStatic(opts);
            } else if (project.type === 'cf-pages' || project.type === 'cf-workers') {
                result = await deployCloudflare(opts);
            } else {
                result = { ok: false, error: `Unknown project type: ${project.type}` };
            }

            activeDeployAbort = null;
            return result;
        } catch (err) {
            activeDeployAbort = null;
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:cancel-deploy', () => {
        if (activeDeployAbort) {
            activeDeployAbort();
            activeDeployAbort = null;
            return { ok: true, message: 'Deploy cancellation requested.' };
        }
        return { ok: false, message: 'No active deploy to cancel.' };
    });

    // ── PM2 IPC Handlers ─────────────────────────────────────────────────────

    ipcMain.handle('deploy:pm2-status', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) {
                return { ok: false, error: 'Server not connected.' };
            }
            const { stdout, code } = await sshManager.exec(serverId, 'pm2 jlist');
            if (code !== 0) return { ok: false, error: 'pm2 jlist failed.' };
            const processes = JSON.parse(stdout || '[]');
            return { ok: true, processes };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:pm2-restart', async (e, serverId, projectId) => {
        try {
            if (!sshManager.isConnected(serverId)) {
                return { ok: false, error: 'Server not connected.' };
            }
            const project = resolveProject(serverId, projectId);
            if (!project) return { ok: false, error: 'Project not found.' };
            const pm2Config = project.pm2Config || 'ecosystem.config.js';
            const remotePath = project.remotePath;
            await sshManager.exec(serverId, `cd "${remotePath}" && pm2 restart "${pm2Config}"`);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:pm2-stop', async (e, serverId, projectId) => {
        try {
            if (!sshManager.isConnected(serverId)) {
                return { ok: false, error: 'Server not connected.' };
            }
            const project = resolveProject(serverId, projectId);
            if (!project) return { ok: false, error: 'Project not found.' };
            const pm2Config = project.pm2Config || 'ecosystem.config.js';
            const remotePath = project.remotePath;
            await sshManager.exec(serverId, `cd "${remotePath}" && pm2 stop "${pm2Config}"`);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Feature 4A: Server Health Stats
    // ─────────────────────────────────────────────────────────────────────────

    ipcMain.handle('deploy:server-stats', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) return { ok: false, error: 'Server not connected.' };

            const cmd = [
                "vmstat 1 2 | tail -1 | awk '{print $15}'",
                "echo '---'",
                "free -m | awk '/^Mem:/{print $2,$3,$7}'",
                "echo '---'",
                "df -h / | tail -1 | awk '{print $2,$3,$4,$5}'",
                "echo '---'",
                "uptime -p 2>/dev/null || uptime | sed 's/.*up //' | sed 's/,.*load.*//'",
                "echo '---'",
                "cat /proc/loadavg 2>/dev/null | awk '{print $1, $2, $3}'"
            ].join(' ; ');

            const { stdout, code } = await sshManager.exec(serverId, cmd);
            if (code !== 0 && !stdout) return { ok: false, error: 'Failed to get stats.' };

            const parts = stdout.split('---').map(s => s.trim());

            const cpuIdle = parseFloat(parts[0]) || 0;
            const cpuPercent = Math.max(0, Math.min(100, 100 - cpuIdle));

            const ramParts = (parts[1] || '').split(/\s+/);
            const ramTotal = parseInt(ramParts[0], 10) || 1;
            const ramUsed = parseInt(ramParts[1], 10) || 0;
            const ramPercent = Math.round((ramUsed / ramTotal) * 100);

            const diskParts = (parts[2] || '').split(/\s+/);
            const diskTotal = diskParts[0] || '0G';
            const diskUsed = diskParts[1] || '0G';
            const diskPercent = parseInt((diskParts[3] || '0%').replace('%', ''), 10) || 0;

            const uptimeStr = (parts[3] || '').trim() || '—';
            const loadAvgStr = (parts[4] || '').trim() || '—';

            return {
                ok: true,
                cpu: { value: Math.round(cpuPercent), percent: Math.round(cpuPercent) },
                ram: { value: ramPercent, percent: ramPercent, used: `${ramUsed}MB`, total: `${ramTotal}MB` },
                disk: { value: diskPercent, percent: diskPercent, used: diskUsed, total: diskTotal },
                uptime: uptimeStr,
                loadAvg: loadAvgStr,
            };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Feature 4B: Security Scan (Rule-based SSH checks)
    // ─────────────────────────────────────────────────────────────────────────

    ipcMain.handle('deploy:security-scan', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) return { ok: false, error: 'Server not connected.' };

            const checks = [];
            const srvCfg = resolveServer(serverId);
            const sudo = srvCfg?.useSudo
                ? `echo '${(srvCfg.sudoPassword ?? '').replace(/'/g, "'\\''")}' | sudo -S `
                : '';

            async function run(cmd) {
                const r = await sshManager.exec(serverId, cmd);
                return (r.stdout || '').trim();
            }

            // 1. Failed login attempts (lastb)
            try {
                const lastb = await run('lastb -n 20 2>/dev/null | wc -l');
                const count = parseInt(lastb, 10) || 0;
                checks.push({
                    id: 'failed-logins',
                    label: 'Failed Login Attempts (lastb)',
                    status: count > 50 ? 'fail' : count > 10 ? 'warn' : 'pass',
                    detail: `${count} failed attempts in recent log`,
                });
            } catch { checks.push({ id: 'failed-logins', label: 'Failed Login Attempts', status: 'warn', detail: 'Could not run lastb' }); }

            // 2. UFW Firewall status
            try {
                const ufw = await run(`${sudo}ufw status 2>/dev/null | head -3`);
                const active = /Status: active/i.test(ufw);
                checks.push({
                    id: 'ufw-status',
                    label: 'UFW Firewall',
                    status: active ? 'pass' : 'fail',
                    detail: active ? 'Active and running' : 'UFW is inactive or not installed',
                });
            } catch { checks.push({ id: 'ufw-status', label: 'UFW Firewall', status: 'warn', detail: 'Could not check UFW' }); }

            // 3. Pending security upgrades
            try {
                const updates = await run(`${sudo}apt-get -s upgrade 2>/dev/null | grep -i security | wc -l`);
                const count = parseInt(updates, 10) || 0;
                checks.push({
                    id: 'security-updates',
                    label: 'Pending Security Updates',
                    status: count > 20 ? 'fail' : count > 0 ? 'warn' : 'pass',
                    detail: count > 0 ? `${count} security updates available` : 'System is up to date',
                });
            } catch { checks.push({ id: 'security-updates', label: 'Security Updates', status: 'warn', detail: 'Could not check updates' }); }

            // 4. SSH root login disabled
            try {
                const sshdConfig = await run(`${sudo}grep -i "^PermitRootLogin" /etc/ssh/sshd_config 2>/dev/null`);
                const rootAllowed = /yes/i.test(sshdConfig);
                const notSet = sshdConfig.trim() === '';
                checks.push({
                    id: 'root-login',
                    label: 'SSH Root Login',
                    status: rootAllowed ? 'fail' : notSet ? 'warn' : 'pass',
                    detail: rootAllowed ? 'Root login is enabled (CRITICAL)' : notSet ? 'PermitRootLogin not explicitly set' : `Set to: ${sshdConfig.trim()}`,
                });
            } catch { checks.push({ id: 'root-login', label: 'SSH Root Login', status: 'warn', detail: 'Could not read sshd_config' }); }

            // 5. Password authentication disabled
            try {
                const passAuth = await run(`${sudo}grep -i "^PasswordAuthentication" /etc/ssh/sshd_config 2>/dev/null`);
                const pwEnabled = /yes/i.test(passAuth);
                const notSet = passAuth.trim() === '';
                checks.push({
                    id: 'pw-auth',
                    label: 'SSH Password Auth',
                    status: pwEnabled ? 'warn' : notSet ? 'warn' : 'pass',
                    detail: pwEnabled ? 'Password auth enabled (prefer SSH keys)' : notSet ? 'Not explicitly set (default: yes)' : 'Disabled — key-only login enforced',
                });
            } catch { checks.push({ id: 'pw-auth', label: 'SSH Password Auth', status: 'warn', detail: 'Could not read sshd_config' }); }

            // 6. Fail2ban installed & running
            try {
                const f2b = await run('systemctl is-active fail2ban 2>/dev/null');
                const active = f2b.trim() === 'active';
                checks.push({
                    id: 'fail2ban',
                    label: 'Fail2Ban Service',
                    status: active ? 'pass' : 'warn',
                    detail: active ? 'Active and protecting SSH' : 'Not running — consider installing fail2ban',
                });
            } catch { checks.push({ id: 'fail2ban', label: 'Fail2Ban', status: 'warn', detail: 'Could not check fail2ban' }); }

            // 7. Open listening ports (ss -tlnp)
            try {
                const ports = await run(`${sudo}ss -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | sed 's/.*://g' | sort -u | tr '\\n' ','`);
                checks.push({
                    id: 'open-ports',
                    label: 'Listening Ports',
                    status: 'pass',
                    detail: ports ? `Open: ${ports.replace(/,$/, '')}` : 'No open ports found',
                });
            } catch { checks.push({ id: 'open-ports', label: 'Listening Ports', status: 'warn', detail: 'Could not list ports' }); }

            // 8. Disk usage
            try {
                const df = await run("df -h / | tail -1 | awk '{print $5}'");
                const pct = parseInt(df.replace('%', ''), 10) || 0;
                checks.push({
                    id: 'disk-usage',
                    label: 'Root Disk Usage',
                    status: pct >= 90 ? 'fail' : pct >= 75 ? 'warn' : 'pass',
                    detail: `${pct}% used on /`,
                });
            } catch { checks.push({ id: 'disk-usage', label: 'Disk Usage', status: 'warn', detail: 'Could not check disk' }); }

            return { ok: true, checks };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Feature 4B+: Access Log Summary (Nginx/Apache)
    // ─────────────────────────────────────────────────────────────────────────

    ipcMain.handle('deploy:access-log-summary', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) return { ok: false, error: 'Server not connected.' };

            const srvCfg = resolveServer(serverId);
            const sudo = srvCfg?.useSudo
                ? `echo '${(srvCfg.sudoPassword ?? '').replace(/'/g, "'\\''")}' | sudo -S `
                : '';

            async function run(cmd) {
                const r = await sshManager.exec(serverId, cmd);
                return (r.stdout || '').trim();
            }

            const logCandidates = [
                '/var/log/nginx/access.log',
                '/var/log/apache2/access.log',
                '/var/log/httpd/access_log',
                '/var/log/nginx/access.log.1',
            ];
            let logFile = null;
            let logSource = 'unknown';
            for (const candidate of logCandidates) {
                const exists = await run(`${sudo}test -f "${candidate}" && echo "yes" || echo "no"`);
                if (exists === 'yes') {
                    logFile = candidate;
                    logSource = candidate.includes('nginx') ? 'nginx' : 'apache';
                    break;
                }
            }

            if (!logFile) {
                return { ok: true, summary: 'No access logs found (checked nginx + apache default locations).', source: 'none', totalRequests: 0 };
            }

            const totalLines = await run(`${sudo}wc -l < "${logFile}" 2>/dev/null`);
            const total = parseInt(totalLines, 10) || 0;

            const topIPsRaw = await run(`${sudo}awk '{print $1}' "${logFile}" | sort | uniq -c | sort -rn | head -15 2>/dev/null`);
            const topURLsRaw = await run(`${sudo}awk '{print $7}' "${logFile}" | sort | uniq -c | sort -rn | head -15 2>/dev/null`);
            const statusCodesRaw = await run(`${sudo}awk '{print $9}' "${logFile}" | grep -E '^[0-9]{3}$' | sort | uniq -c | sort -rn 2>/dev/null`);
            const errorCountRaw = await run(`${sudo}awk '$9 ~ /^[45][0-9]{2}$/ {count++} END {print count+0}' "${logFile}" 2>/dev/null`);
            const errorCount = parseInt(errorCountRaw, 10) || 0;
            const errorRate = total > 0 ? ((errorCount / total) * 100).toFixed(2) : '0';
            const topUAsRaw = await run(`${sudo}awk -F'"' '{print $6}' "${logFile}" | sort | uniq -c | sort -rn | head -10 2>/dev/null`);
            const reqPerHourRaw = await run(`${sudo}awk '{print $4}' "${logFile}" | cut -d: -f2 | sort | uniq -c | sort -k2 -n 2>/dev/null`);
            const errorIPsRaw = await run(`${sudo}awk '$9 ~ /^[45][0-9]{2}$/ {print $1}' "${logFile}" | sort | uniq -c | sort -rn | head -10 2>/dev/null`);

            const summary = [
                `📁 Log Source: ${logFile} (${logSource})`,
                `📊 Total Requests: ${total.toLocaleString()}`,
                `❌ Error Rate: ${errorRate}% (${errorCount.toLocaleString()} errors)`,
                '',
                '─── Top 15 IPs by Request Count ───',
                topIPsRaw || '  (none)',
                '',
                '─── Top 15 Requested URLs ───',
                topURLsRaw || '  (none)',
                '',
                '─── HTTP Status Code Distribution ───',
                statusCodesRaw || '  (none)',
                '',
                '─── Top 10 IPs Causing Errors (4xx/5xx) ───',
                errorIPsRaw || '  (none)',
                '',
                '─── Top 10 User Agents ───',
                topUAsRaw || '  (none)',
                '',
                '─── Requests Per Hour Distribution ───',
                reqPerHourRaw || '  (none)',
            ].join('\n');

            return {
                ok: true,
                summary,
                source: logSource,
                logFile,
                totalRequests: total,
                errorCount,
                errorRate: parseFloat(errorRate),
            };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Feature 4B+: Running Process List
    // ─────────────────────────────────────────────────────────────────────────

    ipcMain.handle('deploy:process-list', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) return { ok: false, error: 'Server not connected.' };

            const srvCfg = resolveServer(serverId);
            const sudo = srvCfg?.useSudo
                ? `echo '${(srvCfg.sudoPassword ?? '').replace(/'/g, "'\\''")}' | sudo -S `
                : '';

            async function run(cmd) {
                const r = await sshManager.exec(serverId, cmd);
                return (r.stdout || '').trim();
            }

            const topCPURaw = await run(`ps aux --sort=-%cpu | head -21 2>/dev/null`);
            const topMemRaw = await run(`ps aux --sort=-%mem | head -21 2>/dev/null`);
            const totalProcsRaw = await run(`ps aux --no-headers | wc -l 2>/dev/null`);
            const totalProcesses = parseInt(totalProcsRaw, 10) || 0;
            const zombieRaw = await run(`ps aux | grep -c '[d]efunct' 2>/dev/null`);
            const zombieCount = parseInt(zombieRaw, 10) || 0;
            const servicesRaw = await run(`${sudo}systemctl list-units --type=service --state=running --no-legend --no-pager 2>/dev/null | awk '{print $1, $4}' | head -50`);
            const failedServicesRaw = await run(`${sudo}systemctl list-units --type=service --state=failed --no-legend --no-pager 2>/dev/null`);
            const listeningRaw = await run(`${sudo}ss -tlnp 2>/dev/null | tail -n +2 | awk '{print $4, $6}' | head -30`);
            const uptimeRaw = await run(`uptime 2>/dev/null`);
            const pm2Raw = await run(`pm2 jlist 2>/dev/null`);
            let pm2Summary = '';
            try {
                if (pm2Raw && pm2Raw.startsWith('[')) {
                    const pm2Procs = JSON.parse(pm2Raw);
                    if (pm2Procs.length > 0) {
                        pm2Summary = pm2Procs.map(p =>
                            `  ${p.name} (pid:${p.pid}) — ${p.pm2_env?.status ?? 'unknown'}, ` +
                            `CPU: ${p.monit?.cpu ?? '?'}%, MEM: ${((p.monit?.memory ?? 0) / 1024 / 1024).toFixed(1)}MB, ` +
                            `Restarts: ${p.pm2_env?.restart_time ?? 0}, ` +
                            `Uptime: ${p.pm2_env?.pm_uptime ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000 / 60) + 'min' : '?'}`
                        ).join('\n');
                    }
                }
            } catch { /* PM2 not available or parse failure — skip */ }

            const dockerRaw = await run(`docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null | head -20`);

            const summary = [
                `🖥️ System: ${uptimeRaw}`,
                `📊 Total Processes: ${totalProcesses}`,
                `💀 Zombie Processes: ${zombieCount}`,
                '',
                '─── Top 20 Processes by CPU Usage ───',
                topCPURaw || '  (unavailable)',
                '',
                '─── Top 20 Processes by Memory Usage ───',
                topMemRaw || '  (unavailable)',
                '',
                '─── Running Services (systemd) ───',
                servicesRaw || '  (none or systemd not available)',
                '',
                failedServicesRaw ? `─── ⚠️ FAILED Services ───\n${failedServicesRaw}\n` : '',
                '─── Listening Network Services ───',
                listeningRaw || '  (none)',
                '',
                pm2Summary ? `─── PM2 Application Processes ───\n${pm2Summary}\n` : '',
                dockerRaw ? `─── Docker Containers ───\n${dockerRaw}\n` : '',
            ].filter(Boolean).join('\n');

            return {
                ok: true,
                summary,
                totalProcesses,
                zombieCount,
                hasPm2: !!pm2Summary,
                hasDocker: !!dockerRaw,
                hasFailedServices: !!failedServicesRaw,
            };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Feature 4B: AI Key Management + Mode Selection
    // ─────────────────────────────────────────────────────────────────────────

    ipcMain.handle('deploy:get-ai-keys', () => {
        try {
            const config = readFullConfig();
            return {
                ok: true,
                groqKeys: config.groqKeys ?? [],
                geminiKeys: config.geminiKeys ?? [],
                aiMode: config.aiMode ?? 'gemini-cli',
                geminiCliModel: config.geminiCliModel ?? 'gemini-3.1-pro-preview',
            };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:save-ai-keys', (e, { groqKeys, geminiKeys, aiMode, geminiCliModel }) => {
        const { writeFullConfig } = require('../../services/configStore');
        try {
            const config = readFullConfig();
            config.groqKeys = groqKeys ?? [];
            config.geminiKeys = geminiKeys ?? [];
            if (aiMode) config.aiMode = aiMode;
            if (geminiCliModel) config.geminiCliModel = geminiCliModel;
            writeFullConfig(config);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:check-gemini-cli', () => {
        try {
            const { checkGeminiCliAvailability } = require('../../services/aiProvider');
            return checkGeminiCliAvailability();
        } catch (err) {
            return { available: false, reason: err.message };
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Feature 4B: AI Security Scan (via unified aiProvider)
    // ─────────────────────────────────────────────────────────────────────────

    ipcMain.handle('deploy:ai-scan', async (e, { serverName, stats, checks, accessLog, processInfo }) => {
        const { analyze } = require('../../services/aiProvider');

        const failChecks = (checks || []).filter(c => c.status === 'fail').map(c => `❌ ${c.label}: ${c.detail}`).join('\n');
        const warnChecks = (checks || []).filter(c => c.status === 'warn').map(c => `⚠️ ${c.label}: ${c.detail}`).join('\n');
        const passChecks = (checks || []).filter(c => c.status === 'pass').map(c => `✅ ${c.label}: ${c.detail}`).join('\n');

        const statsStr = stats ? [
            `CPU: ${stats.cpu?.percent ?? '?'}%`,
            `RAM: ${stats.ram?.used ?? '?'}MB / ${stats.ram?.total ?? '?'}MB (${stats.ram?.percent ?? '?'}%)`,
            `Disk: ${stats.disk?.used ?? '?'} / ${stats.disk?.total ?? '?'} (${stats.disk?.percent ?? '?'}%)`,
        ].join('\n') : 'No stats available';

        const prompt = `You are a senior Linux system security and performance analyst. Analyze the following COMPREHENSIVE server report for "${serverName}" and provide:\n1. OVERALL RISK LEVEL (Critical/High/Medium/Low)\n2. CRITICAL FINDINGS — things that must be fixed immediately\n3. SECURITY WARNINGS — things that should be improved soon\n4. PERFORMANCE ANALYSIS — based on CPU, RAM, process list, and access patterns\n5. SUSPICIOUS ACTIVITY — unusual IPs, bots, brute force attempts, or error spikes from access logs\n6. PROCESS HEALTH — zombie processes, high CPU/memory consumers, failed services\n7. RECOMMENDATIONS — concrete actionable steps with exact commands\n8. POSITIVE NOTES — what is already well-configured\n\nSERVER HEALTH:\n${statsStr}\n\nSECURITY CHECK RESULTS:\nFAILURES:\n${failChecks || 'None'}\n\nWARNINGS:\n${warnChecks || 'None'}\n\nPASSING:\n${passChecks || 'None'}\n\n${accessLog ? `ACCESS LOG ANALYSIS:\n${accessLog}` : 'ACCESS LOGS: Not available'}\n\n${processInfo ? `RUNNING PROCESSES & SERVICES:\n${processInfo}` : 'PROCESS LIST: Not available'}\n\nProvide a concise, actionable security and performance report in markdown format. Include specific Linux commands where relevant. Pay special attention to:\n- IPs with suspiciously high request counts (possible DDoS/brute force)\n- High error rates in access logs (misconfiguration or attacks)\n- Processes consuming excessive CPU or memory\n- Zombie/defunct processes that need cleanup\n- Failed systemd services that need attention\n- PM2/Docker application health if present`;

        return await analyze(prompt, { maxTokens: 4096 });
    });
}

module.exports = { registerHandlers };
