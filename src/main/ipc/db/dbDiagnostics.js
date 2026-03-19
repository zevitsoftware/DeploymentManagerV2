'use strict';
/**
 * ipc/db/dbDiagnostics.js
 *
 * IPC handlers for per-database deep diagnostics and AI analysis.
 * Covers: db:run-diagnostics, db:ai-analyze (MySQL, PostgreSQL, MongoDB, Redis)
 */

const { readFullConfig } = require('../../services/configStore');
const { _resolveConnection } = require('./dbConfigHandlers');

// ── MySQL Deep Diagnostics ────────────────────────────────────────────────────

async function diagMySQL(conn) {
    const mysql = require('mysql2/promise');
    const client = await mysql.createConnection({
        host: conn.host, port: conn.port ?? 3306,
        user: conn.username, password: conn.password,
        database: conn.database ?? undefined,
        connectTimeout: 15000,
        ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
    });

    const results = { type: 'mysql', checks: [] };

    try {
        // 1. Version
        const [vRows] = await client.query('SELECT VERSION() AS ver');
        results.version = vRows[0]?.ver;

        // 2. Database size
        if (conn.database) {
            const [sizeRows] = await client.query(`
                SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                FROM information_schema.tables WHERE table_schema = ?
            `, [conn.database]);
            results.checks.push({
                id: 'db-size', label: 'Database Size',
                status: 'info',
                detail: `${sizeRows[0]?.size_mb ?? 0} MB`,
            });
        }

        // 3. Tables without Primary Key
        if (conn.database) {
            const [noPk] = await client.query(`
                SELECT t.TABLE_NAME
                FROM information_schema.TABLES t
                LEFT JOIN information_schema.TABLE_CONSTRAINTS tc
                    ON t.TABLE_SCHEMA = tc.TABLE_SCHEMA
                    AND t.TABLE_NAME = tc.TABLE_NAME
                    AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                WHERE t.TABLE_SCHEMA = ? AND t.TABLE_TYPE = 'BASE TABLE'
                    AND tc.CONSTRAINT_NAME IS NULL
            `, [conn.database]);
            results.checks.push({
                id: 'no-pk', label: 'Tables Without Primary Key',
                status: noPk.length > 0 ? 'warn' : 'pass',
                detail: noPk.length > 0
                    ? `${noPk.length} table(s): ${noPk.map(r => r.TABLE_NAME).join(', ')}`
                    : 'All tables have primary keys',
            });
        }

        // 4. Unused Indexes (zero cardinality)
        if (conn.database) {
            const [unusedIdx] = await client.query(`
                SELECT s.TABLE_NAME, s.INDEX_NAME, s.SEQ_IN_INDEX, s.CARDINALITY
                FROM information_schema.STATISTICS s
                LEFT JOIN information_schema.TABLE_CONSTRAINTS tc
                    ON s.TABLE_SCHEMA = tc.TABLE_SCHEMA
                    AND s.TABLE_NAME = tc.TABLE_NAME
                    AND s.INDEX_NAME = tc.CONSTRAINT_NAME
                WHERE s.TABLE_SCHEMA = ?
                    AND s.INDEX_NAME != 'PRIMARY'
                    AND tc.CONSTRAINT_NAME IS NULL
                    AND s.SEQ_IN_INDEX = 1
                    AND (s.CARDINALITY IS NULL OR s.CARDINALITY = 0)
                LIMIT 20
            `, [conn.database]);
            results.checks.push({
                id: 'unused-idx', label: 'Potentially Unused Indexes',
                status: unusedIdx.length > 0 ? 'warn' : 'pass',
                detail: unusedIdx.length > 0
                    ? `${unusedIdx.length} index(es): ${unusedIdx.map(r => `${r.TABLE_NAME}.${r.INDEX_NAME}`).join(', ')}`
                    : 'No obviously unused indexes detected',
            });
        }

        // 5. Table Fragmentation (data_free > 10MB)
        if (conn.database) {
            const [frag] = await client.query(`
                SELECT TABLE_NAME,
                       ROUND(DATA_FREE / 1024 / 1024, 2) AS free_mb,
                       ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_mb
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
                    AND DATA_FREE > 10485760
                ORDER BY DATA_FREE DESC LIMIT 10
            `, [conn.database]);
            results.checks.push({
                id: 'fragmentation', label: 'Table Fragmentation (>10MB free)',
                status: frag.length > 0 ? 'warn' : 'pass',
                detail: frag.length > 0
                    ? frag.map(r => `${r.TABLE_NAME}: ${r.free_mb}MB free / ${r.total_mb}MB total`).join('; ')
                    : 'No significant fragmentation',
                fix: frag.length > 0 ? frag.map(r => `OPTIMIZE TABLE \`${r.TABLE_NAME}\`;`).join('\n') : null,
            });
        }

        // 6. Slow Query Log Status
        const [sqVars] = await client.query("SHOW VARIABLES LIKE 'slow_query_log'");
        const slowOn = sqVars[0]?.Value === 'ON';
        results.checks.push({
            id: 'slow-query-log', label: 'Slow Query Log',
            status: slowOn ? 'pass' : 'warn',
            detail: slowOn ? 'Enabled' : 'Disabled — consider enabling for performance monitoring',
            fix: !slowOn ? "SET GLOBAL slow_query_log = 'ON';\nSET GLOBAL long_query_time = 2;" : null,
        });

        // 7. Connection Usage
        const [maxConn] = await client.query("SHOW VARIABLES LIKE 'max_connections'");
        const [curConn] = await client.query("SHOW STATUS LIKE 'Threads_connected'");
        const maxC = parseInt(maxConn[0]?.Value ?? '151', 10);
        const curC = parseInt(curConn[0]?.Value ?? '1', 10);
        const connPct = Math.round((curC / maxC) * 100);
        results.checks.push({
            id: 'connections', label: 'Connection Usage',
            status: connPct > 80 ? 'fail' : connPct > 50 ? 'warn' : 'pass',
            detail: `${curC} / ${maxC} (${connPct}%)`,
        });

        // 8. InnoDB Buffer Pool Hit Rate
        const [bpReads] = await client.query("SHOW STATUS LIKE 'Innodb_buffer_pool_read_requests'");
        const [bpDisk] = await client.query("SHOW STATUS LIKE 'Innodb_buffer_pool_reads'");
        const readReq = parseInt(bpReads[0]?.Value ?? '0', 10);
        const diskRead = parseInt(bpDisk[0]?.Value ?? '0', 10);
        const hitRate = readReq > 0 ? ((1 - diskRead / readReq) * 100).toFixed(2) : '100';
        results.checks.push({
            id: 'buffer-pool', label: 'InnoDB Buffer Pool Hit Rate',
            status: parseFloat(hitRate) < 95 ? 'warn' : 'pass',
            detail: `${hitRate}% (reads from memory vs disk)`,
        });

    } finally {
        await client.end();
    }

    return { ok: true, ...results };
}

// ── PostgreSQL Deep Diagnostics ───────────────────────────────────────────────

async function diagPgSQL(conn) {
    const { Client } = require('pg');
    const client = new Client({
        host: conn.host, port: conn.port ?? 5432,
        user: conn.username, password: conn.password,
        database: conn.database ?? 'postgres',
        connectionTimeoutMillis: 15000,
        ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();

    const results = { type: 'pgsql', checks: [] };

    try {
        // 1. Version
        const vRes = await client.query('SELECT version()');
        results.version = vRes.rows[0]?.version;

        // 2. Database Size
        const sRes = await client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`);
        results.checks.push({
            id: 'db-size', label: 'Database Size',
            status: 'info', detail: sRes.rows[0]?.size ?? 'unknown',
        });

        // 3. Tables without Primary Key
        const noPk = await client.query(`
            SELECT c.relname AS table_name
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'r' AND n.nspname = 'public'
                AND NOT EXISTS (
                    SELECT 1 FROM pg_constraint co
                    WHERE co.conrelid = c.oid AND co.contype = 'p'
                )
            ORDER BY c.relname
        `);
        results.checks.push({
            id: 'no-pk', label: 'Tables Without Primary Key',
            status: noPk.rows.length > 0 ? 'warn' : 'pass',
            detail: noPk.rows.length > 0
                ? `${noPk.rows.length}: ${noPk.rows.map(r => r.table_name).join(', ')}`
                : 'All tables have primary keys',
        });

        // 4. Unused Indexes
        const unusedIdx = await client.query(`
            SELECT s.relname AS table_name, i.relname AS index_name,
                   pg_size_pretty(pg_relation_size(i.oid)) AS index_size, s.idx_scan
            FROM pg_stat_user_indexes s
            JOIN pg_index idx ON idx.indexrelid = s.indexrelid
            JOIN pg_class i ON i.oid = s.indexrelid
            WHERE s.idx_scan = 0 AND NOT idx.indisprimary AND NOT idx.indisunique
            ORDER BY pg_relation_size(i.oid) DESC LIMIT 20
        `);
        results.checks.push({
            id: 'unused-idx', label: 'Unused Indexes (0 scans)',
            status: unusedIdx.rows.length > 0 ? 'warn' : 'pass',
            detail: unusedIdx.rows.length > 0
                ? unusedIdx.rows.map(r => `${r.table_name}.${r.index_name} (${r.index_size})`).join('; ')
                : 'All indexes have been used',
            fix: unusedIdx.rows.length > 0
                ? unusedIdx.rows.map(r => `DROP INDEX IF EXISTS "${r.index_name}";`).join('\n')
                : null,
        });

        // 5. Table Bloat (dead tuples)
        const bloat = await client.query(`
            SELECT relname AS table_name, n_live_tup, n_dead_tup,
                   CASE WHEN n_live_tup > 0
                        THEN ROUND(100.0 * n_dead_tup / n_live_tup, 1) ELSE 0 END AS dead_pct,
                   last_autovacuum
            FROM pg_stat_user_tables WHERE n_dead_tup > 1000
            ORDER BY n_dead_tup DESC LIMIT 10
        `);
        results.checks.push({
            id: 'bloat', label: 'Table Bloat (Dead Tuples)',
            status: bloat.rows.length > 0 ? 'warn' : 'pass',
            detail: bloat.rows.length > 0
                ? bloat.rows.map(r => `${r.table_name}: ${r.n_dead_tup} dead (${r.dead_pct}%)`).join('; ')
                : 'No significant bloat detected',
            fix: bloat.rows.length > 0
                ? bloat.rows.map(r => `VACUUM ANALYZE "${r.table_name}";`).join('\n')
                : null,
        });

        // 6. Cache Hit Rate
        const cache = await client.query(`
            SELECT ROUND(
                100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2
            ) AS hit_rate
            FROM pg_stat_database WHERE datname = current_database()
        `);
        const hitRate = cache.rows[0]?.hit_rate ?? 100;
        results.checks.push({
            id: 'cache-hit', label: 'Cache Hit Rate',
            status: hitRate < 95 ? 'warn' : 'pass',
            detail: `${hitRate}%`,
        });

        // 7. Connection Count
        const connRes = await client.query(`
            SELECT count(*) AS cnt,
                   (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_conn
            FROM pg_stat_activity
        `);
        const cur = parseInt(connRes.rows[0]?.cnt ?? '0', 10);
        const max = parseInt(connRes.rows[0]?.max_conn ?? '100', 10);
        const pct = Math.round((cur / max) * 100);
        results.checks.push({
            id: 'connections', label: 'Connection Usage',
            status: pct > 80 ? 'fail' : pct > 50 ? 'warn' : 'pass',
            detail: `${cur} / ${max} (${pct}%)`,
        });

        // 8. Slow Queries (if pg_stat_statements available)
        try {
            const slow = await client.query(`
                SELECT query, calls, ROUND(total_exec_time::numeric, 2) AS total_ms,
                       ROUND(mean_exec_time::numeric, 2) AS mean_ms
                FROM pg_stat_statements WHERE mean_exec_time > 1000
                ORDER BY mean_exec_time DESC LIMIT 5
            `);
            if (slow.rows.length > 0) {
                results.checks.push({
                    id: 'slow-queries', label: 'Slow Queries (mean >1s)',
                    status: 'warn',
                    detail: slow.rows.map(r => `${r.mean_ms}ms avg (${r.calls} calls): ${r.query.substring(0, 80)}…`).join('\n'),
                });
            }
        } catch { /* pg_stat_statements not installed — skip */ }

    } finally {
        await client.end();
    }

    return { ok: true, ...results };
}

// ── MongoDB Deep Diagnostics ──────────────────────────────────────────────────

async function diagMongo(conn) {
    const { MongoClient } = require('mongodb');
    const uri = conn.uri || `mongodb://${conn.username ? `${conn.username}:${conn.password}@` : ''}${conn.host}:${conn.port ?? 27017}/${conn.database ?? ''}`;
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
    });
    await client.connect();

    const results = { type: 'mongodb', checks: [] };

    try {
        const admin = client.db().admin();
        const info = await admin.serverInfo();
        results.version = `MongoDB ${info.version}`;

        const dbName = conn.database ?? 'admin';
        const db = client.db(dbName);

        // 1. Database Stats
        const stats = await db.stats();
        const sizeMB = (stats.dataSize / 1024 / 1024).toFixed(2);
        const indexSizeMB = (stats.indexSize / 1024 / 1024).toFixed(2);
        results.checks.push({
            id: 'db-size', label: 'Database Size',
            status: 'info',
            detail: `Data: ${sizeMB} MB, Indexes: ${indexSizeMB} MB, Collections: ${stats.collections}`,
        });

        // 2. Collection Stats & Index Usage
        const colls = await db.listCollections().toArray();
        const largeColls = [];
        const noIndexColls = [];
        const unusedIndexes = [];

        for (const coll of colls) {
            if (coll.name.startsWith('system.')) continue;
            try {
                const collStats = await db.command({ collStats: coll.name });
                if (collStats.size > 50 * 1024 * 1024) {
                    largeColls.push({ name: coll.name, sizeMB: (collStats.size / 1024 / 1024).toFixed(1) });
                }
                try {
                    const idxStats = await db.collection(coll.name).aggregate([{ $indexStats: {} }]).toArray();
                    const hasNonIdIndex = idxStats.some(s => s.name !== '_id_');
                    if (!hasNonIdIndex && collStats.count > 10000) {
                        noIndexColls.push(coll.name);
                    }
                    for (const s of idxStats) {
                        if (s.name === '_id_') continue;
                        if (s.accesses?.ops === 0) {
                            unusedIndexes.push(`${coll.name}.${s.name}`);
                        }
                    }
                } catch { /* skip collections that don't support $indexStats */ }
            } catch { /* skip */ }
        }

        results.checks.push({
            id: 'large-colls', label: 'Large Collections (>50MB)',
            status: largeColls.length > 0 ? 'info' : 'pass',
            detail: largeColls.length > 0
                ? largeColls.map(c => `${c.name}: ${c.sizeMB} MB`).join('; ')
                : 'No collections over 50MB',
        });

        results.checks.push({
            id: 'no-idx', label: 'Collections Without Indexes (>10k docs)',
            status: noIndexColls.length > 0 ? 'warn' : 'pass',
            detail: noIndexColls.length > 0
                ? `${noIndexColls.length}: ${noIndexColls.join(', ')}`
                : 'All large collections have indexes',
        });

        results.checks.push({
            id: 'unused-idx', label: 'Unused Indexes (0 accesses)',
            status: unusedIndexes.length > 0 ? 'warn' : 'pass',
            detail: unusedIndexes.length > 0
                ? unusedIndexes.slice(0, 10).join('; ') + (unusedIndexes.length > 10 ? ` (+${unusedIndexes.length - 10} more)` : '')
                : 'All indexes are being used',
            fix: unusedIndexes.length > 0
                ? unusedIndexes.slice(0, 5).map(idx => {
                    const [col, name] = idx.split('.');
                    return `db.${col}.dropIndex("${name}")`;
                }).join('\n')
                : null,
        });

        // 3. Connection pool
        try {
            const serverStatus = await admin.command({ serverStatus: 1 });
            const curConns = serverStatus.connections?.current ?? 0;
            const availConns = serverStatus.connections?.available ?? 0;
            const totalConns = curConns + availConns;
            const pct = totalConns > 0 ? Math.round((curConns / totalConns) * 100) : 0;
            results.checks.push({
                id: 'connections', label: 'Connection Usage',
                status: pct > 80 ? 'fail' : pct > 50 ? 'warn' : 'pass',
                detail: `${curConns} / ${totalConns} (${pct}%)`,
            });

            // 4. Opcounters
            const ops = serverStatus.opcounters ?? {};
            results.checks.push({
                id: 'opcounters', label: 'Operation Counts',
                status: 'info',
                detail: `Insert: ${ops.insert ?? 0}, Query: ${ops.query ?? 0}, Update: ${ops.update ?? 0}, Delete: ${ops.delete ?? 0}`,
            });
        } catch { /* may fail on Atlas free tier */ }

    } finally {
        await client.close();
    }

    return { ok: true, ...results };
}

// ── Redis Deep Diagnostics ────────────────────────────────────────────────────

async function diagRedis(conn) {
    const Redis = require('ioredis');
    const client = new Redis({
        host: conn.host, port: conn.port ?? 6379,
        password: conn.password || undefined,
        connectTimeout: 10000,
        tls: conn.ssl ? { rejectUnauthorized: false } : undefined,
        lazyConnect: true,
    });
    await client.connect();

    const results = { type: 'redis', checks: [] };

    function parseInfo(raw) {
        const result = {};
        for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const [key, val] = trimmed.split(':');
            if (key && val) result[key] = val.trim();
        }
        return result;
    }

    try {
        const serverInfo = parseInfo(await client.info('server'));
        const memoryInfo = parseInfo(await client.info('memory'));
        const statsInfo = parseInfo(await client.info('stats'));
        const clientsInfo = parseInfo(await client.info('clients'));
        const keyspaceInfo = parseInfo(await client.info('keyspace'));

        results.version = `Redis ${serverInfo.redis_version ?? 'unknown'}`;

        // 1. Memory Usage
        results.checks.push({
            id: 'memory', label: 'Memory Usage', status: 'info',
            detail: `Used: ${memoryInfo.used_memory_human ?? '0B'}, Peak: ${memoryInfo.used_memory_peak_human ?? '0B'}, Max: ${memoryInfo.maxmemory_human ?? 'unlimited'}`,
        });

        // 2. Memory Fragmentation
        const fragRatio = parseFloat(memoryInfo.mem_fragmentation_ratio ?? '1');
        results.checks.push({
            id: 'fragmentation', label: 'Memory Fragmentation Ratio',
            status: fragRatio > 1.5 ? 'warn' : fragRatio < 1 ? 'warn' : 'pass',
            detail: `${fragRatio.toFixed(2)} (ideal: 1.0–1.5)`,
        });

        // 3. Hit/Miss Ratio
        const hits = parseInt(statsInfo.keyspace_hits ?? '0', 10);
        const misses = parseInt(statsInfo.keyspace_misses ?? '0', 10);
        const totalLookups = hits + misses;
        const hitRate = totalLookups > 0 ? ((hits / totalLookups) * 100).toFixed(2) : '100';
        results.checks.push({
            id: 'hit-rate', label: 'Cache Hit Rate',
            status: parseFloat(hitRate) < 90 ? 'warn' : 'pass',
            detail: `${hitRate}% (${hits} hits / ${misses} misses)`,
        });

        // 4. Connected Clients
        const connectedClients = parseInt(clientsInfo.connected_clients ?? '1', 10);
        const maxClients = parseInt(serverInfo.maxclients ?? '10000', 10);
        const clientPct = Math.round((connectedClients / maxClients) * 100);
        results.checks.push({
            id: 'connections', label: 'Connected Clients',
            status: clientPct > 80 ? 'fail' : clientPct > 50 ? 'warn' : 'pass',
            detail: `${connectedClients} / ${maxClients} (${clientPct}%)`,
        });

        // 5. Evicted Keys
        const evicted = parseInt(statsInfo.evicted_keys ?? '0', 10);
        results.checks.push({
            id: 'evicted', label: 'Evicted Keys',
            status: evicted > 0 ? 'warn' : 'pass',
            detail: evicted > 0 ? `${evicted} keys evicted — consider increasing maxmemory` : 'No keys evicted',
        });

        // 6. Keyspace Info
        const dbEntries = Object.entries(keyspaceInfo)
            .filter(([k]) => k.startsWith('db'))
            .map(([k, v]) => `${k}: ${v}`);
        results.checks.push({
            id: 'keyspace', label: 'Keyspace', status: 'info',
            detail: dbEntries.length > 0 ? dbEntries.join('; ') : 'No databases with keys',
        });

        // 7. Slow Log
        try {
            const slowlog = await client.slowlog('get', 5);
            results.checks.push({
                id: 'slowlog', label: 'Recent Slow Commands',
                status: slowlog.length > 0 ? 'warn' : 'pass',
                detail: slowlog.length > 0
                    ? slowlog.map(s => `${(s[2] / 1000).toFixed(1)}ms: ${(Array.isArray(s[3]) ? s[3].join(' ') : s[3]).substring(0, 80)}`).join('; ')
                    : 'No slow commands in log',
            });
        } catch { /* slowlog may be disabled */ }

        // 8. Persistence
        const rdbEnabled = serverInfo.rdb_last_save_time !== undefined;
        const aofEnabled = serverInfo.aof_enabled === '1';
        results.checks.push({
            id: 'persistence', label: 'Persistence',
            status: (!rdbEnabled && !aofEnabled) ? 'warn' : 'pass',
            detail: `RDB: ${rdbEnabled ? 'yes' : 'no'}, AOF: ${aofEnabled ? 'yes' : 'no'}`,
        });

    } finally {
        await client.quit();
    }

    return { ok: true, ...results };
}

// ── Register Handlers ─────────────────────────────────────────────────────────

function registerHandlers(ipcMain, win) {

    ipcMain.handle('db:run-diagnostics', async (e, connId) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };

        try {
            if (conn.type === 'mysql') return await diagMySQL(conn);
            if (conn.type === 'pgsql') return await diagPgSQL(conn);
            if (conn.type === 'mongodb') return await diagMongo(conn);
            if (conn.type === 'redis') return await diagRedis(conn);
            return { ok: false, error: `Unknown type: ${conn.type}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── AI Database Analysis ──────────────────────────────────────────────────

    ipcMain.handle('db:ai-analyze', async (e, { connName, dbType, version, checks }) => {
        const { analyze } = require('../../services/aiProvider');

        const checksSummary = (checks || []).map(c => {
            const icon = c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : c.status === 'fail' ? '❌' : 'ℹ️';
            return `${icon} ${c.label}: ${c.detail}${c.fix ? `\n   Suggested fix: ${c.fix}` : ''}`;
        }).join('\n');

        const prompt = `You are a senior database performance analyst. Analyze the following ${dbType.toUpperCase()} database diagnostics for "${connName}" (version: ${version || 'unknown'}) and provide:
1. OVERALL HEALTH SCORE (0-100) with rating (Critical/Poor/Fair/Good/Excellent)
2. CRITICAL ISSUES — problems that need immediate attention
3. PERFORMANCE WARNINGS — parameters to optimize
4. QUICK WINS — simple fixes that have high impact
5. LONG-TERM RECOMMENDATIONS — architectural improvements
6. SPECIFIC COMMANDS — ready-to-run SQL/shell commands for fixes

DIAGNOSTIC RESULTS:
${checksSummary}

Provide actionable recommendations in markdown format. Include specific query examples where applicable.`;

        return await analyze(prompt, { maxTokens: 4096 });
    });
}

module.exports = { registerHandlers };
