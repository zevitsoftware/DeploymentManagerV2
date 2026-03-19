'use strict';
/**
 * ipc/cf/cfAccountHandlers.js
 *
 * IPC handlers for Cloudflare account management:
 * - Account CRUD (get, save, delete)
 * - Account verification (User Token, Global Key, Account Token)
 * - WHOIS cache/lookup/key management
 *
 * Exports cfHeaders() and CF_API for cross-module use.
 */

const axios = require('axios');
const { readFullConfig, writeFullConfig } = require('../../services/configStore');

const CF_API = 'https://api.cloudflare.com/client/v4';

/**
 * Build auth headers for a Cloudflare account object.
 * Supports both API Token (Bearer) and Global API Key (X-Auth headers).
 */
function cfHeaders(account) {
    if (account.apiToken) {
        return {
            'Authorization': `Bearer ${account.apiToken}`,
            'Content-Type': 'application/json',
        };
    }
    return {
        'X-Auth-Email': account.email,
        'X-Auth-Key': account.apiKey,
        'Content-Type': 'application/json',
    };
}

function registerHandlers(ipcMain, win) {

    // ── Account CRUD ──────────────────────────────────────────────────────────

    ipcMain.handle('cf:get-accounts', () => {
        const config = readFullConfig();
        return config.cloudflare?.accounts ?? [];
    });

    ipcMain.handle('cf:save-account', (e, account) => {
        const config = readFullConfig();
        if (!config.cloudflare) config.cloudflare = { accounts: [] };
        const idx = config.cloudflare.accounts.findIndex(a => a.id === account.id);
        if (idx >= 0) {
            config.cloudflare.accounts[idx] = account;
        } else {
            config.cloudflare.accounts.push(account);
        }
        writeFullConfig(config);
        return { ok: true };
    });

    ipcMain.handle('cf:delete-account', (e, accountId) => {
        const config = readFullConfig();
        if (!config.cloudflare) return { ok: true };
        config.cloudflare.accounts = config.cloudflare.accounts.filter(a => a.id !== accountId);
        writeFullConfig(config);
        return { ok: true };
    });

    // ── Verify Account ────────────────────────────────────────────────────────

    ipcMain.handle('cf:verify-account', async (e, account) => {
        const headers = cfHeaders(account);

        // 1) User API Token verify
        try {
            const { data } = await axios.get(`${CF_API}/user/tokens/verify`, { headers });
            if (data.success) {
                return { ok: true, status: data.result?.status ?? 'active', tokenType: 'user' };
            }
        } catch { /* not a user token */ }

        // 2) Global API Key (/user endpoint)
        try {
            const { data } = await axios.get(`${CF_API}/user`, { headers });
            if (data.success) {
                return { ok: true, email: data.result?.email, status: 'active', tokenType: 'global' };
            }
        } catch { /* not a global key */ }

        // 3) Account API Token (list accounts)
        try {
            const { data } = await axios.get(`${CF_API}/accounts`, { headers, params: { per_page: 1 } });
            if (data.success && data.result?.length > 0) {
                return {
                    ok: true, status: 'active', tokenType: 'account',
                    accountName: data.result[0].name,
                    accountId: data.result[0].id,
                };
            }
            if (data.success) {
                return { ok: true, status: 'active', tokenType: 'account' };
            }
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }

        return { ok: false, error: 'Valid user-level authentication not found' };
    });

    // ── WHOIS Cache ───────────────────────────────────────────────────────────

    ipcMain.handle('cf:get-whois-cache', async () => {
        const cfg = readFullConfig();
        return cfg.whoisCache ?? {};
    });

    ipcMain.handle('cf:save-whois-entry', async (e, { domainName, data }) => {
        const cfg = readFullConfig();
        if (!cfg.whoisCache) cfg.whoisCache = {};
        cfg.whoisCache[domainName] = { ...data, fetchedAt: new Date().toISOString() };
        writeFullConfig(cfg);
        return { ok: true };
    });

    // ── WHOIS Lookup (WhoisXML API) ───────────────────────────────────────────

    ipcMain.handle('cf:whois-lookup', async (e, { domainName, cfAccountId }) => {
        const cfg = readFullConfig();
        const whoisKey = cfg.whoisApiKey;
        if (!whoisKey) return { ok: false, error: 'WhoisXML API key not configured. Set it in CloudFlare sidebar settings.' };

        try {
            const { data } = await axios.get('https://www.whoisxmlapi.com/whoisserver/WhoisService', {
                params: { apiKey: whoisKey, domainName, outputFormat: 'JSON' },
                timeout: 15000,
            });
            const rec = data?.WhoisRecord;
            if (!rec) return { ok: false, error: 'No WHOIS data returned' };

            const extractContact = (c) => {
                if (!c) return null;
                return {
                    name: c.name ?? null, organization: c.organization ?? null,
                    street: c.street1 ?? null, city: c.city ?? null, state: c.state ?? null,
                    postalCode: c.postalCode ?? null, country: c.country ?? null,
                    countryCode: c.countryCode ?? null, email: c.email ?? null,
                    telephone: c.telephone ?? null, fax: c.fax ?? null,
                };
            };

            const result = {
                ok: true,
                domain: rec.domainName ?? domainName,
                domainExt: rec.domainNameExt ?? null,
                registrar: rec.registrarName ?? rec.registryData?.registrarName ?? null,
                registrarIANAID: rec.registrarIANAID ?? rec.registryData?.registrarIANAID ?? null,
                whoisServer: rec.registryData?.whoisServer ?? null,
                createdDate: rec.createdDateNormalized ?? rec.createdDate ?? rec.registryData?.createdDate ?? null,
                expiresDate: rec.expiresDateNormalized ?? rec.registryData?.expiresDateNormalized ?? rec.registryData?.expiresDate ?? rec.expiresDate ?? null,
                updatedDate: rec.updatedDateNormalized ?? rec.updatedDate ?? rec.registryData?.updatedDate ?? null,
                estimatedDomainAge: rec.estimatedDomainAge ?? null,
                domainAvailability: rec.domainAvailability ?? null,
                nameservers: rec.nameServers?.hostNames ?? rec.registryData?.nameServers?.hostNames ?? [],
                status: rec.status ?? rec.registryData?.status ?? null,
                ips: rec.ips ?? [],
                contactEmail: rec.contactEmail ?? null,
                registrant: extractContact(rec.registrant),
                administrativeContact: extractContact(rec.administrativeContact),
                technicalContact: extractContact(rec.technicalContact),
                registrarContactEmail: rec.customField1Value ?? null,
                registrarContactPhone: rec.customField2Value ?? null,
                registrarURL: rec.customField3Value ?? null,
                rawText: rec.rawText ?? '',
            };

            // Auto-save to encrypted cache
            const cfg2 = readFullConfig();
            if (!cfg2.whoisCache) cfg2.whoisCache = {};
            cfg2.whoisCache[domainName] = { ...result, cfAccountId: cfAccountId ?? null, fetchedAt: new Date().toISOString() };
            writeFullConfig(cfg2);

            return result;
        } catch (err) {
            const msg = err.response?.data?.ErrorMessage?.msg || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── WHOIS API Key CRUD ────────────────────────────────────────────────────

    ipcMain.handle('cf:get-whois-key', async () => {
        const cfg = readFullConfig();
        return cfg.whoisApiKey ?? '';
    });

    ipcMain.handle('cf:save-whois-key', async (e, key) => {
        const cfg = readFullConfig();
        cfg.whoisApiKey = key;
        writeFullConfig(cfg);
        return { ok: true };
    });
}

module.exports = { registerHandlers, cfHeaders, CF_API };
