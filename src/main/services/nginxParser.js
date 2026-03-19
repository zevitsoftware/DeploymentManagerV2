'use strict';
/**
 * src/main/services/nginxParser.js
 * Migrated from: nginxParser.js (legacy root)
 *
 * Nginx Domain Discovery & Management via SSH.
 * No logic changes — only file location updated.
 */

const SITES_AVAILABLE = '/etc/nginx/sites-available';
const SITES_ENABLED = '/etc/nginx/sites-enabled';

async function scanNginxDomains(serverId, sshManager) {
    const enabledCmd = [
        `find ${SITES_ENABLED} -maxdepth 1 \\( -type l -o -type f \\)`,
        `-exec basename {} \\; 2>/dev/null`,
    ].join(' ');
    const enabledResult = await sshManager.exec(serverId, enabledCmd);
    const enabledNames = new Set(
        (enabledResult.stdout || '').split('\n').map(f => f.trim()).filter(Boolean)
    );

    const availableCmd = [
        `find ${SITES_AVAILABLE} -maxdepth 1 -type f`,
        `-exec basename {} \\; 2>/dev/null`,
    ].join(' ');
    const availableResult = await sshManager.exec(serverId, availableCmd);
    const availableNames = (availableResult.stdout || '')
        .split('\n').map(f => f.trim()).filter(Boolean);

    const allFileNames = [...new Set([...availableNames, ...enabledNames])];
    if (allFileNames.length === 0) return { enabled: [], available: [] };

    const readParts = allFileNames.map(name => {
        const filePath = availableNames.includes(name)
            ? `${SITES_AVAILABLE}/${name}`
            : `${SITES_ENABLED}/${name}`;
        return `echo "===NGINX_FILE:${name}==="; cat "${filePath}" 2>/dev/null`;
    });
    const readResult = await sshManager.exec(serverId, readParts.join('; '));
    const rawOutput = readResult.stdout || '';

    const fileContents = {};
    const sections = rawOutput.split(/===NGINX_FILE:(.+?)===/);
    for (let i = 1; i < sections.length; i += 2) {
        const fileName = sections[i].trim();
        const content = (sections[i + 1] || '').trim();
        if (fileName) fileContents[fileName] = content;
    }

    const enabled = [];
    const available = [];

    for (const [fileName, content] of Object.entries(fileContents)) {
        const isEnabled = enabledNames.has(fileName);
        const configFile = availableNames.includes(fileName)
            ? `${SITES_AVAILABLE}/${fileName}`
            : `${SITES_ENABLED}/${fileName}`;

        const blocks = extractServerBlocks(content);
        const parsedBlocks = blocks.map(b => parseServerBlock(b, configFile)).filter(Boolean);

        if (parsedBlocks.length === 0) {
            const entry = { name: fileName.replace(/\.conf$/, ''), aliases: [], ports: [], ssl: false, proxyPass: null, root: null, configFile, fileName };
            (isEnabled ? enabled : available).push(entry);
            continue;
        }

        const domainMap = new Map();
        for (const block of parsedBlocks) {
            if (block.name === '_' || block.name === 'localhost') continue;
            const allNames = [block.name, ...block.aliases];
            const nonWww = allNames.find(n => !n.startsWith('www.')) ?? block.name;
            const key = nonWww.replace(/^www\./, '');
            if (!domainMap.has(key)) domainMap.set(key, { primaryName: null, blocks: [] });
            const group = domainMap.get(key);
            group.blocks.push(block);
            if (block.ssl && !group.primaryName) group.primaryName = nonWww;
        }

        for (const [, { primaryName: pName, blocks: group }] of domainMap) {
            const sslBlock = group.find(b => b.ssl) ?? group[0];
            const primaryName = pName ?? sslBlock.name;
            const allPorts = [...new Set(group.flatMap(b => b.ports))];
            const allAliases = [...new Set(group.flatMap(b => [b.name, ...b.aliases]))];
            const entry = {
                name: primaryName,
                aliases: allAliases.filter(a => a !== primaryName),
                ports: allPorts.sort((a, b) => a - b),
                ssl: group.some(b => b.ssl),
                proxyPass: sslBlock.proxyPass ?? group.find(b => b.proxyPass)?.proxyPass ?? null,
                root: sslBlock.root ?? group.find(b => b.root)?.root ?? null,
                configFile,
                fileName,
            };
            (isEnabled ? enabled : available).push(entry);
        }
    }

    const sortFn = (a, b) => {
        if (a.ssl !== b.ssl) return a.ssl ? -1 : 1;
        return a.name.localeCompare(b.name);
    };
    enabled.sort(sortFn);
    available.sort(sortFn);
    return { enabled, available };
}

function _sudoPrefix(sudoPassword) {
    if (!sudoPassword) return 'sudo';
    const escaped = sudoPassword.replace(/'/g, "'\\''");
    return `echo '${escaped}' | sudo -S`;
}

async function enableDomain(serverId, sshManager, fileName, sudoPassword) {
    const src = `${SITES_AVAILABLE}/${fileName}`;
    const dst = `${SITES_ENABLED}/${fileName}`;
    const sudo = _sudoPrefix(sudoPassword);
    const result = await sshManager.exec(serverId, `${sudo} ln -sf "${src}" "${dst}" && ${sudo} nginx -t && ${sudo} nginx -s reload`);
    if (result.code !== 0) throw new Error(result.stderr || `Failed to enable ${fileName}`);
    return { ok: true };
}

async function disableDomain(serverId, sshManager, fileName, sudoPassword) {
    const dst = `${SITES_ENABLED}/${fileName}`;
    const sudo = _sudoPrefix(sudoPassword);
    const result = await sshManager.exec(serverId, `${sudo} rm -f "${dst}" && ${sudo} nginx -t && ${sudo} nginx -s reload`);
    if (result.code !== 0) throw new Error(result.stderr || `Failed to disable ${fileName}`);
    return { ok: true };
}

async function removeDomain(serverId, sshManager, fileName, sudoPassword) {
    const src = `${SITES_AVAILABLE}/${fileName}`;
    const dst = `${SITES_ENABLED}/${fileName}`;
    const sudo = _sudoPrefix(sudoPassword);
    const result = await sshManager.exec(serverId, `${sudo} rm -f "${dst}" "${src}" && ${sudo} nginx -t && ${sudo} nginx -s reload`);
    if (result.code !== 0) throw new Error(result.stderr || `Failed to remove ${fileName}`);
    return { ok: true };
}

async function addDomain(serverId, sshManager, fileName, content, sudoPassword) {
    const dst = `${SITES_AVAILABLE}/${fileName}`;
    const b64 = Buffer.from(content, 'utf8').toString('base64');
    const sudo = _sudoPrefix(sudoPassword);
    let writeCmd;
    if (sudoPassword) {
        const escapedPwd = sudoPassword.replace(/'/g, "'\\''");
        writeCmd = `echo '${escapedPwd}' | sudo -S bash -c 'echo "${b64}" | base64 -d > "${dst}"'`;
    } else {
        writeCmd = `echo '${b64}' | base64 -d | sudo tee "${dst}" > /dev/null`;
    }
    const writeResult = await sshManager.exec(serverId, writeCmd);
    if (writeResult.code !== 0) throw new Error(writeResult.stderr || `Failed to create ${fileName}`);
    const testResult = await sshManager.exec(serverId, `${sudo} nginx -t 2>&1`);
    if (testResult.code !== 0) {
        await sshManager.exec(serverId, `${sudo} rm -f "${dst}"`);
        const errMsg = (testResult.stdout || '') + (testResult.stderr || '');
        throw new Error(`Nginx syntax test failed — config was NOT saved.\n${errMsg.trim()}`);
    }
    return { ok: true };
}

async function getDomainConfig(serverId, sshManager, fileName) {
    const cmd = `cat "${SITES_AVAILABLE}/${fileName}" 2>/dev/null || cat "${SITES_ENABLED}/${fileName}" 2>/dev/null`;
    const result = await sshManager.exec(serverId, cmd);
    return result.stdout || '';
}

function extractServerBlocks(text) {
    return _extractServerBlocksRaw(text).map(b => b.body);
}

function _extractServerBlocksRaw(text) {
    const blocks = [];
    let i = 0;
    while (i < text.length) {
        const serverIdx = text.indexOf('server', i);
        if (serverIdx === -1) break;
        const before = text[serverIdx - 1];
        const after = text[serverIdx + 6];
        if (before && /\w/.test(before)) { i = serverIdx + 6; continue; }
        if (after && /\w/.test(after)) { i = serverIdx + 6; continue; }
        const openBrace = text.indexOf('{', serverIdx + 6);
        if (openBrace === -1) break;
        let depth = 1;
        let j = openBrace + 1;
        while (j < text.length && depth > 0) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') depth--;
            if (text[j] === '#') { while (j < text.length && text[j] !== '\n') j++; }
            j++;
        }
        if (depth === 0) {
            const textBefore = text.slice(0, serverIdx);
            const linesAbove = textBefore.split('\n');
            let k = linesAbove.length - 1;
            if (k >= 0 && linesAbove[k].trim() === '') k--;
            while (k >= 0) {
                const line = linesAbove[k].trim();
                if (line === '' || line.startsWith('#')) k--;
                else break;
            }
            const commentLines = linesAbove.slice(k + 1);
            const commentAbove = commentLines.join('\n').trim();
            const fullStart = k >= 0 ? linesAbove.slice(0, k + 1).join('\n').length + 1 : 0;
            blocks.push({ body: text.slice(openBrace + 1, j - 1), full: text.slice(fullStart, j).trim(), commentAbove });
            i = j;
        } else {
            i = openBrace + 1;
        }
    }
    return blocks;
}

function parseServerBlock(block, configFile) {
    const clean = block.replace(/#[^\n]*/g, ' ');
    const serverNameMatch = clean.match(/\bserver_name\s+([^;]+);/);
    if (!serverNameMatch) return null;
    const names = serverNameMatch[1].trim().split(/\s+/).filter(Boolean);
    if (names.length === 0 || names[0] === '_') return null;
    const [primaryName, ...aliases] = names;
    const listens = [];
    let ssl = false;
    const listenRe = /\blisten\s+([^;]+);/g;
    let listenMatch;
    while ((listenMatch = listenRe.exec(clean)) !== null) {
        const parts = listenMatch[1].trim().split(/\s+/);
        for (const p of parts) {
            const portMatch = p.match(/(?:^|:)(\d{1,5})$/);
            if (portMatch) {
                const port = parseInt(portMatch[1], 10);
                if (!isNaN(port) && !listens.includes(port)) listens.push(port);
            }
            if (p === 'ssl') ssl = true;
        }
    }
    if (/\bssl_certificate\b/.test(clean)) ssl = true;
    const proxyMatch = clean.match(/\bproxy_pass\s+([^;]+);/);
    const proxyPass = proxyMatch ? proxyMatch[1].trim() : null;
    const rootMatch = clean.match(/\broot\s+([^;]+);/);
    const root = rootMatch ? rootMatch[1].trim() : null;
    return { name: primaryName, aliases, ports: listens.length > 0 ? listens : [ssl ? 443 : 80], ssl, proxyPass, root, configFile };
}

async function splitConfigFile(serverId, sshManager, fileName, sudoPassword) {
    const sudo = _sudoPrefix(sudoPassword);
    const filePath = `${SITES_AVAILABLE}/${fileName}`;
    const readResult = await sshManager.exec(serverId, `cat "${filePath}"`);
    if (readResult.code !== 0) throw new Error(`Cannot read ${filePath}`);
    const content = readResult.stdout || '';
    const rawBlocks = _extractServerBlocksRaw(content);
    if (rawBlocks.length <= 1) return { ok: false, error: 'File has 0 or 1 server blocks — nothing to split.' };
    const domainMap = new Map();
    const catchAllBlocks = [];
    for (const raw of rawBlocks) {
        const parsed = parseServerBlock(raw.body, filePath);
        if (!parsed) {
            if (/\bdefault_server\b/.test(raw.body) || /\bserver_name\s+_\s*;/.test(raw.body)) catchAllBlocks.push(raw);
            continue;
        }
        const allNames = [parsed.name, ...parsed.aliases];
        const nonWww = allNames.find(n => !n.startsWith('www.')) ?? parsed.name;
        const key = nonWww.replace(/^www\./, '');
        if (!domainMap.has(key)) domainMap.set(key, { primaryName: null, rawBlocks: [] });
        const group = domainMap.get(key);
        group.rawBlocks.push(raw);
        if (parsed.ssl && !group.primaryName) group.primaryName = nonWww;
    }
    if (domainMap.size <= 1) return { ok: false, error: 'Only 1 unique domain found — nothing to split.' };
    const filesToCreate = [];
    for (const [key, { rawBlocks: rBlocks }] of domainMap) {
        filesToCreate.push({ name: `${key}.conf`, content: rBlocks.map(r => r.full).join('\n\n') + '\n' });
    }
    const updatedOriginal = catchAllBlocks.length > 0
        ? catchAllBlocks.map(r => r.full).join('\n\n') + '\n'
        : '# This file has been split into individual domain configs.\n';
    for (const f of filesToCreate) {
        const dst = `${SITES_AVAILABLE}/${f.name}`;
        const b64 = Buffer.from(f.content, 'utf8').toString('base64');
        const writeCmd = sudoPassword
            ? `echo '${sudoPassword.replace(/'/g, "'\\''")}' | sudo -S bash -c 'echo "${b64}" | base64 -d > "${dst}"'`
            : `echo '${b64}' | base64 -d | sudo tee "${dst}" > /dev/null`;
        const wr = await sshManager.exec(serverId, writeCmd);
        if (wr.code !== 0) throw new Error(`Failed to write ${f.name}: ${wr.stderr}`);
    }
    const symlinkCmds = filesToCreate.map(f => `${sudo} ln -sf "${SITES_AVAILABLE}/${f.name}" "${SITES_ENABLED}/${f.name}"`).join(' && ');
    const slResult = await sshManager.exec(serverId, symlinkCmds);
    if (slResult.code !== 0) throw new Error(`Failed to create symlinks: ${slResult.stderr}`);
    const origB64 = Buffer.from(updatedOriginal, 'utf8').toString('base64');
    const updateCmd = sudoPassword
        ? `echo '${sudoPassword.replace(/'/g, "'\\''")}' | sudo -S bash -c 'echo "${origB64}" | base64 -d > "${filePath}"'`
        : `echo '${origB64}' | base64 -d | sudo tee "${filePath}" > /dev/null`;
    const updResult = await sshManager.exec(serverId, updateCmd);
    if (updResult.code !== 0) throw new Error(`Failed to update original file: ${updResult.stderr}`);
    const testResult = await sshManager.exec(serverId, `${sudo} nginx -t 2>&1`);
    if (testResult.code !== 0) {
        const restoreB64 = Buffer.from(content, 'utf8').toString('base64');
        const restoreCmd = sudoPassword
            ? `echo '${sudoPassword.replace(/'/g, "'\\''")}' | sudo -S bash -c 'echo "${restoreB64}" | base64 -d > "${filePath}"'`
            : `echo '${restoreB64}' | base64 -d | sudo tee "${filePath}" > /dev/null`;
        await sshManager.exec(serverId, restoreCmd);
        const cleanupPaths = filesToCreate.flatMap(f => [`${SITES_AVAILABLE}/${f.name}`, `${SITES_ENABLED}/${f.name}`]).map(p => `"${p}"`).join(' ');
        await sshManager.exec(serverId, `${sudo} rm -f ${cleanupPaths}`);
        const errMsg = (testResult.stdout || '') + (testResult.stderr || '');
        throw new Error(`Nginx syntax test failed — ROLLED BACK.\n${errMsg.trim()}`);
    }
    const reloadResult = await sshManager.exec(serverId, `${sudo} nginx -s reload`);
    if (reloadResult.code !== 0) throw new Error(`Nginx reload failed: ${reloadResult.stderr}`);
    return { ok: true, splitCount: filesToCreate.length };
}

module.exports = { scanNginxDomains, enableDomain, disableDomain, removeDomain, addDomain, getDomainConfig, splitConfigFile };
