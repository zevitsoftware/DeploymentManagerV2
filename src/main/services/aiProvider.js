'use strict';
/**
 * src/main/services/aiProvider.js
 * Migrated from: ipc/shared/aiProvider.js (legacy)
 *
 * Unified AI provider for Zevitsoft Deployment Manager v2.
 *
 * Mode 1 — Gemini CLI (DEFAULT):
 *   Reuses the installed Gemini CLI's stored OAuth credentials to call
 *   the same CloudCode API endpoint (cloudcode-pa.googleapis.com).
 *   FREE via Google AI Ultra / Google One AI subscription.
 *   Credential path: %USERPROFILE%\.gemini\oauth_creds.json
 *
 * Mode 2 — API Key:
 *   Round-robin through Groq keys first (Qwen3 32B, fast + free),
 *   then Gemini API keys as fallback.
 *
 * Usage:
 *   const ai = require('./aiProvider');
 *   const result = await ai.analyze(prompt, config);
 *   // result: { ok, analysis, provider, model } | { ok: false, error }
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
// ← Updated path: configStore is now a sibling in services/
const { readFullConfig } = require('./configStore');

// ── Gemini CLI / CloudCode constants ─────────────────────────────────────────

const CODE_ASSIST_ENDPOINT = 'https://cloudcode-pa.googleapis.com';
const CODE_ASSIST_API_VERSION = 'v1internal';
const OAUTH_CREDS_PATH = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
const GEMINI_CLI_MODEL_DEFAULT = 'gemini-2.5-flash';

/**
 * Extract OAuth Client ID & Secret from the installed Gemini CLI package.
 * The values live in @google/gemini-cli-core's oauth2.js (ESM module),
 * so we read the file as text and regex-extract them instead of importing.
 * This avoids hardcoding Google's OAuth credentials in our source code.
 */
let _cachedOAuthCreds = null;
function _getGeminiCliOAuthCreds() {
    if (_cachedOAuthCreds) return _cachedOAuthCreds;

    // Possible lookup paths: global npm, local node_modules
    const possiblePaths = [
        // Global npm (Windows)
        path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@google', 'gemini-cli', 'node_modules', '@google', 'gemini-cli-core', 'dist', 'src', 'code_assist', 'oauth2.js'),
        // Global npm (Unix)
        path.join('/usr', 'lib', 'node_modules', '@google', 'gemini-cli', 'node_modules', '@google', 'gemini-cli-core', 'dist', 'src', 'code_assist', 'oauth2.js'),
        // Local node_modules (if installed locally)
        path.join(__dirname, '..', '..', '..', 'node_modules', '@google', 'gemini-cli-core', 'dist', 'src', 'code_assist', 'oauth2.js'),
    ];

    let source = null;
    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p)) {
                source = fs.readFileSync(p, 'utf-8');
                break;
            }
        } catch { /* try next */ }
    }

    if (!source) {
        throw new Error(
            'Cannot find @google/gemini-cli-core package.\n' +
            'Install Gemini CLI globally: npm install -g @google/gemini-cli\n' +
            'Then retry.'
        );
    }

    const idMatch = source.match(/const\s+OAUTH_CLIENT_ID\s*=\s*['"]([^'"]+)['"]/);
    const secretMatch = source.match(/const\s+OAUTH_CLIENT_SECRET\s*=\s*['"]([^'"]+)['"]/);

    if (!idMatch || !secretMatch) {
        throw new Error(
            'Failed to extract OAuth credentials from Gemini CLI package.\n' +
            'The package format may have changed. Update Gemini CLI: npm update -g @google/gemini-cli'
        );
    }

    _cachedOAuthCreds = { clientId: idMatch[1], clientSecret: secretMatch[1] };
    return _cachedOAuthCreds;
}

// Module-level cache for the OAuth client / projectId
// (re-uses across calls; refreshes token automatically)
let _oauthClient = null;
let _projectId = null;
let _sessionId = null;

// ── Gemini CLI helpers ────────────────────────────────────────────────────────

function _getOAuthCreds() {
    if (!fs.existsSync(OAUTH_CREDS_PATH)) {
        throw new Error(
            `Gemini CLI credentials not found at: ${OAUTH_CREDS_PATH}\n` +
            'Run the "gemini" CLI and sign in with your Google account first.'
        );
    }
    const raw = fs.readFileSync(OAUTH_CREDS_PATH, 'utf-8');
    const creds = JSON.parse(raw);
    if (!creds.refresh_token) {
        throw new Error('No refresh_token found in Gemini CLI credentials. Re-authenticate with the "gemini" CLI.');
    }
    return creds;
}

async function _ensureOAuthClient() {
    if (_oauthClient) return;
    const { OAuth2Client } = require('google-auth-library');
    const creds = _getOAuthCreds();
    const { clientId, clientSecret } = _getGeminiCliOAuthCreds();
    const client = new OAuth2Client({ clientId, clientSecret });
    client.setCredentials({
        refresh_token: creds.refresh_token,
        access_token: creds.access_token,
        expiry_date: creds.expiry_date,
    });
    // Persist refreshed tokens back to the file
    client.on('tokens', (tokens) => {
        try {
            const existing = JSON.parse(fs.readFileSync(OAUTH_CREDS_PATH, 'utf-8'));
            fs.writeFileSync(OAUTH_CREDS_PATH, JSON.stringify({ ...existing, ...tokens }, null, 2));
        } catch { /* ignore */ }
    });
    _oauthClient = client;
    _sessionId = crypto.randomUUID();
}

/**
 * Extract a string project ID from a value that may be:
 * - a string: "projects/some-id" → return as-is
 * - an object: { id: "some-id" } → return id
 * - an empty object: {} → return null
 * - undefined/null → return null
 */
function _extractProjectId(val) {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        if (val.id && typeof val.id === 'string') return val.id;
        if (val.name && typeof val.name === 'string') return val.name;
        if (Object.keys(val).length === 0) return null;
        return null;
    }
    return null;
}

/**
 * Check if an error is VALIDATION_REQUIRED.
 */
function _isValidationRequired(err) {
    const msg = (err.message ?? '').toLowerCase();
    const reason = err.response?.data?.error?.details?.[0]?.reason ?? '';
    return msg.includes('verify your account') ||
        reason === 'VALIDATION_REQUIRED' ||
        msg.includes('validation_required');
}

async function _cloudCodeRequest(method, body, maxRetries = 3) {
    await _ensureOAuthClient();
    const url = `${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:${method}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await _oauthClient.request({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'GeminiCLI/0.33.1 (zevitsoft-deploy-bridge)',
                },
                body: JSON.stringify(body),
                responseType: 'json',
            });
            return response.data;
        } catch (err) {
            const status = err.response?.status ?? err.code;
            const isRateLimit = status === 429 ||
                err.response?.data?.error?.status === 'RESOURCE_EXHAUSTED' ||
                (err.message ?? '').toLowerCase().includes('exhausted');

            if (isRateLimit && attempt < maxRetries) {
                // Extract retry delay from API response
                const retryInfo = err.response?.data?.error?.details?.find(
                    d => d['@type']?.includes('RetryInfo')
                );
                const delayStr = retryInfo?.retryDelay ?? '10s';
                const delaySec = parseFloat(delayStr) || 10;
                const delayMs = Math.ceil(delaySec * 1000) + 500;
                await new Promise(r => setTimeout(r, delayMs));
                continue;
            }

            throw err;
        }
    }
}

async function _ensureProjectId() {
    if (_projectId) return;
    const res = await _cloudCodeRequest('loadCodeAssist', {
        cloudaicompanionProject: undefined,
        metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI', duetProject: undefined },
    });
    _projectId = _extractProjectId(res.cloudaicompanionProject);

    if (!_projectId) {
        // Free tier onboarding
        const tierId = res.allowedTiers?.[0]?.id ?? 'FREE';
        try {
            const onboardRes = await _cloudCodeRequest('onboardUser', {
                tierId,
                metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' },
            });

            // Try multiple extraction paths
            _projectId = _extractProjectId(onboardRes.cloudaicompanionProject)
                ?? _extractProjectId(onboardRes.response?.cloudaicompanionProject)
                ?? null;

            if (!_projectId && onboardRes.name) {
                // Long-running operation — poll
                let lro = onboardRes;
                let tries = 0;
                while (!lro.done && tries++ < 10) {
                    await new Promise(r => setTimeout(r, 3000));
                    const lroResp = await _oauthClient.request({
                        url: `${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}/${lro.name}`,
                        method: 'GET', responseType: 'json',
                    });
                    lro = lroResp.data;
                }
                _projectId = _extractProjectId(lro.response?.cloudaicompanionProject)
                    ?? _extractProjectId(lro.cloudaicompanionProject)
                    ?? null;
            }
        } catch { /* onboarding failed, try retry below */ }
    }

    if (!_projectId) {
        // Last resort: retry loadCodeAssist after onboarding attempt
        try {
            const retryRes = await _cloudCodeRequest('loadCodeAssist', {
                cloudaicompanionProject: undefined,
                metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI', duetProject: undefined },
            });
            _projectId = _extractProjectId(retryRes.cloudaicompanionProject);
        } catch { /* ignore */ }
    }

    if (!_projectId) {
        throw new Error(
            'Failed to get CloudCode project ID. Possible causes:\n' +
            '1. This Google account has not used Gemini CLI / Gemini in IDEs before\n' +
            '2. Go to https://gemini.google.com/ and accept ToS with this account\n' +
            '3. Or try: gemini auth login\n' +
            '4. Then retry'
        );
    }
}

async function _cliGenerateContent(promptText, maxTokens = 4096, model = GEMINI_CLI_MODEL_DEFAULT) {
    await _ensureProjectId();
    const body = {
        model: model,
        project: _projectId,
        user_prompt_id: crypto.randomUUID(),
        request: {
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            session_id: _sessionId,
            generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
        },
    };
    const data = await _cloudCodeRequest('generateContent', body);
    const response = data.response ?? data;
    const text = response.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
    return text;
}

// ── Check CLI availability ────────────────────────────────────────────────────

/**
 * Returns { available: bool, reason?: string }
 */
function checkGeminiCliAvailability() {
    if (!fs.existsSync(OAUTH_CREDS_PATH)) {
        return { available: false, reason: 'Gemini CLI credentials not found. Run "gemini" and sign in first.' };
    }
    try {
        const creds = JSON.parse(fs.readFileSync(OAUTH_CREDS_PATH, 'utf-8'));
        if (!creds.refresh_token) {
            return { available: false, reason: 'No refresh_token in credentials. Re-authenticate with "gemini" CLI.' };
        }
    } catch {
        return { available: false, reason: 'Failed to read Gemini CLI credentials file.' };
    }
    // Check if google-auth-library is installed
    try {
        require.resolve('google-auth-library');
    } catch {
        return { available: false, reason: 'google-auth-library not installed. Run: npm install google-auth-library' };
    }
    // Check if Gemini CLI package is available (needed for OAuth creds extraction)
    try {
        _getGeminiCliOAuthCreds();
    } catch (err) {
        return { available: false, reason: err.message };
    }
    return { available: true };
}

// ── API Key helpers ───────────────────────────────────────────────────────────

async function _callWithApiKey(attempt, messages, prompt, maxTokens = 2048) {
    const axios = require('axios');
    if (attempt.provider === 'groq') {
        const resp = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            { model: 'qwen/qwen3-32b', messages, max_tokens: maxTokens, temperature: 0.3, reasoning_effort: 'none' },
            { headers: { Authorization: `Bearer ${attempt.key}`, 'Content-Type': 'application/json' }, timeout: 60000 }
        );
        return resp.data?.choices?.[0]?.message?.content || '';
    } else {
        const resp = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent?key=${attempt.key}`,
            { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 } },
            { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
        );
        return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
}

// ── Main exported analyze function ───────────────────────────────────────────

/**
 * Run AI analysis using the configured mode.
 *
 * @param {string} prompt   — The full prompt text to send
 * @param {{ maxTokens?: number }} [opts]
 * @returns {{ ok: true, analysis: string, provider: string, model: string }
 *          | { ok: false, error: string }}
 */
async function analyze(prompt, opts = {}) {
    const config = readFullConfig();
    const aiMode = config.aiMode ?? 'gemini-cli'; // default: gemini-cli
    const maxTokens = opts.maxTokens ?? 4096;

    // ── Mode 1: Gemini CLI ────────────────────────────────────────────────────
    if (aiMode === 'gemini-cli') {
        const check = checkGeminiCliAvailability();
        if (!check.available) {
            return { ok: false, error: `Gemini CLI mode not available: ${check.reason}` };
        }
        try {
            const cliModel = config.geminiCliModel || GEMINI_CLI_MODEL_DEFAULT;
            const analysis = await _cliGenerateContent(prompt, maxTokens, cliModel);
            if (analysis) return { ok: true, analysis, provider: 'Gemini CLI', model: cliModel };
            return { ok: false, error: 'Empty response from Gemini CLI.' };
        } catch (err) {
            const msg = err.message ?? String(err);
            const statusCode = err.response?.status;
            const apiStatus = err.response?.data?.error?.status;
            const apiMsg = err.response?.data?.error?.message ?? '';
            let friendly;

            if (msg.includes('RESOURCE_EXHAUSTED') || statusCode === 429) {
                friendly = 'Gemini CLI quota exhausted. Try again later or switch to API Key mode.';
            } else if (msg.includes('UNAUTHENTICATED') || statusCode === 401) {
                friendly = 'Gemini CLI credentials expired. Run "gemini" CLI and re-authenticate.';
            } else if (_isValidationRequired(err)) {
                friendly = 'Account verification required. Visit https://gemini.google.com/ and verify your account, then retry.';
            } else if (apiStatus === 'NOT_FOUND' || statusCode === 404) {
                friendly = `Model not found: "${config.geminiCliModel || GEMINI_CLI_MODEL_DEFAULT}". ` +
                    'The CloudCode API may not support this model yet. Try a different model (e.g. gemini-2.5-flash, gemini-2.5-pro).';
            } else {
                friendly = apiMsg || msg;
            }
            return { ok: false, error: friendly };
        }
    }

    // ── Mode 2: API Keys (Groq → Gemini) ─────────────────────────────────────
    const groqKeys = config.groqKeys ?? [];
    const geminiKeys = config.geminiKeys ?? [];
    const messages = [{ role: 'user', content: prompt }];

    const attempts = [
        ...groqKeys.map(k => ({ provider: 'groq', key: k })),
        ...geminiKeys.map(k => ({ provider: 'gemini', key: k })),
    ];

    if (attempts.length === 0) {
        return { ok: false, error: 'No AI API keys configured. Add Groq or Gemini keys in AI Settings, or switch to Gemini CLI mode.' };
    }

    let lastError = null;
    for (const attempt of attempts) {
        try {
            const analysis = await _callWithApiKey(attempt, messages, prompt, maxTokens);
            if (analysis) {
                const isGroq = attempt.provider === 'groq';
                return {
                    ok: true,
                    analysis,
                    provider: isGroq ? 'Groq' : 'Gemini',
                    model: isGroq ? 'Qwen3 32B' : 'Gemini 2.0 Flash',
                };
            }
            lastError = `Empty response from ${attempt.provider}`;
        } catch (err) {
            const status = err.response?.status;
            if (status === 429 || status === 401 || (status >= 500 && status < 600)) {
                lastError = `${attempt.provider} key failed (HTTP ${status}), trying next…`;
                continue;
            }
            if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
                lastError = `${attempt.provider} request timed out, trying next…`;
                continue;
            }
            lastError = err.message;
            continue;
        }
    }

    return { ok: false, error: lastError || 'All AI API keys exhausted without a successful response.' };
}

module.exports = { analyze, checkGeminiCliAvailability };
