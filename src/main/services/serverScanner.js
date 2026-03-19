'use strict';
/**
 * src/main/services/serverScanner.js
 * Migrated from: serverScanner.js (legacy root)
 *
 * Smart Project Scanner via SSH.
 * Discovers PM2 processes, Nginx sites, Systemd services on a remote server.
 *
 * ← Updated import: nginxParser is now a sibling in services/
 */

// ← Updated path: sibling within services/
const { scanNginxDomains } = require('./nginxParser');

/**
 * @param {string} serverId
 * @param {object} sshManager
 * @param {(msg: string) => void} [sendLog]
 * @returns {Promise<{ pm2: object[], static: object[], systemd: object[], raw: object }>}
 */
async function scanServer(serverId, sshManager, sendLog) {
    const log = sendLog ?? (() => {});

    log('🔍 Scanning PM2 processes...');
    const pm2Apps = await scanPm2(serverId, sshManager);
    log(`   Found ${pm2Apps.length} PM2 process(es)`);

    log('🔍 Scanning Nginx sites...');
    let nginxSites = { enabled: [], available: [] };
    try {
        nginxSites = await scanNginxDomains(serverId, sshManager);
        log(`   Found ${nginxSites.enabled.length} enabled, ${nginxSites.available.length} available`);
    } catch (err) {
        log(`   ⚠️ Nginx scan failed: ${err.message}`);
    }

    log('🔍 Scanning systemd services...');
    const systemdServices = await scanSystemd(serverId, sshManager);
    log(`   Found ${systemdServices.length} node-related service(s)`);

    log('🔍 Reading git configuration...');
    for (const app of pm2Apps) {
        if (app.cwd) {
            try {
                const gitInfo = await readGitInfo(serverId, sshManager, app.cwd);
                app.repo = gitInfo.remoteUrl ?? '';
                app.branch = gitInfo.branch ?? 'main';
            } catch (_) {
                app.repo = '';
                app.branch = 'main';
            }
        }
    }

    log('🔗 Cross-referencing PM2 with Nginx...');
    const crossRef = crossReference(pm2Apps, nginxSites.enabled);

    log('🔗 Detecting static sites from Nginx...');
    const staticSites = detectStaticSites(nginxSites.enabled, pm2Apps);

    for (const site of staticSites) {
        if (site.webRoot) {
            try {
                const gitInfo = await readGitInfo(serverId, sshManager, site.webRoot);
                site.repo = gitInfo.remoteUrl ?? '';
                site.branch = gitInfo.branch ?? 'main';
            } catch (_) {
                site.repo = '';
                site.branch = 'main';
            }
        }
    }

    log(`✅ Scan complete: ${crossRef.length} PM2, ${staticSites.length} static, ${systemdServices.length} systemd`);

    return {
        pm2: crossRef,
        static: staticSites,
        systemd: systemdServices,
        raw: { pm2Apps, nginxSites },
    };
}

async function scanPm2(serverId, sshManager) {
    const result = await sshManager.exec(serverId, 'pm2 jlist 2>/dev/null');
    if (result.code !== 0 || !result.stdout.trim()) return [];

    let processes;
    try {
        processes = JSON.parse(result.stdout);
    } catch (_) {
        return [];
    }

    if (!Array.isArray(processes)) return [];

    return processes.map(proc => {
        const env = proc.pm2_env ?? {};
        const port = env.PORT ?? env.NODE_PORT ?? env.env?.PORT ?? env.env?.NODE_PORT ?? null;
        const pm2Config = 'ecosystem.config.js';

        return {
            name: proc.name ?? 'unknown',
            cwd: env.pm_cwd ?? env.cwd ?? '',
            status: env.status ?? 'unknown',
            port: port ? parseInt(port, 10) : null,
            pid: proc.pid ?? null,
            pm2Id: proc.pm_id ?? null,
            memory: proc.monit?.memory ?? 0,
            cpu: proc.monit?.cpu ?? 0,
            uptime: env.pm_uptime ?? null,
            restarts: env.restart_time ?? 0,
            pm2Config,
            domain: null,
            ssl: false,
            repo: '',
            branch: 'main',
        };
    });
}

async function scanSystemd(serverId, sshManager) {
    const cmd = `systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | grep -iE '(node|next|nuxt|python|gunicorn|uvicorn|deno|bun)' || true`;
    const result = await sshManager.exec(serverId, cmd);
    if (result.code !== 0 || !result.stdout.trim()) return [];

    const services = [];
    for (const line of result.stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        const unit = parts[0] ?? '';
        if (!unit.endsWith('.service')) continue;
        const name = unit.replace('.service', '');
        const status = parts[3] ?? 'running';
        const description = parts.slice(4).join(' ');
        services.push({ name, unit, status, description });
    }

    return services;
}

async function readGitInfo(serverId, sshManager, dirPath) {
    const cmd = `cd "${dirPath}" 2>/dev/null && git remote get-url origin 2>/dev/null && echo "===BRANCH===" && git branch --show-current 2>/dev/null`;
    const result = await sshManager.exec(serverId, cmd);
    if (result.code !== 0) return { remoteUrl: null, branch: null };
    const parts = (result.stdout || '').split('===BRANCH===');
    const remoteUrl = (parts[0] ?? '').trim();
    const branch = (parts[1] ?? '').trim() || null;
    return { remoteUrl: remoteUrl || null, branch };
}

function crossReference(pm2Apps, enabledNginxSites) {
    const portToNginx = new Map();
    for (const site of enabledNginxSites) {
        if (site.proxyPass) {
            const portMatch = site.proxyPass.match(/:(\d+)/);
            if (portMatch) portToNginx.set(parseInt(portMatch[1], 10), site);
        }
    }
    for (const app of pm2Apps) {
        if (app.port && portToNginx.has(app.port)) {
            const site = portToNginx.get(app.port);
            app.domain = site.name;
            app.ssl = site.ssl;
        }
    }
    return pm2Apps;
}

function detectStaticSites(enabledNginxSites, pm2Apps) {
    const pm2Ports = new Set(pm2Apps.filter(a => a.port).map(a => a.port));
    const staticSites = [];
    for (const site of enabledNginxSites) {
        if (site.proxyPass) {
            const portMatch = site.proxyPass.match(/:(\d+)/);
            if (portMatch && pm2Ports.has(parseInt(portMatch[1], 10))) continue;
            continue;
        }
        if (!site.root) continue;
        if (site.name === '_' || site.name === 'localhost' || site.name === 'default') continue;
        staticSites.push({
            name: site.name,
            domain: site.name,
            ssl: site.ssl,
            webRoot: site.root,
            configFile: site.configFile,
            fileName: site.fileName,
            repo: '',
            branch: 'main',
        });
    }
    return staticSites;
}

module.exports = { scanServer };
