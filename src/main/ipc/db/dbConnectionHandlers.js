'use strict';
/**
 * ipc/db/dbConnectionHandlers.js
 *
 * IPC handlers for database connection lifecycle:
 * - db:test-connection   — quick connectivity + version check
 * - db:connect           — open a persistent client for querying
 * - db:disconnect        — close a persistent client
 * - db:execute-query     — run a query on an open connection
 * - db:get-schema        — introspect schema metadata (tables, collections, keys)
 * - db:browse-table      — paginated table/collection data browser
 * - db:chat-query        — AI-powered natural language DB query
 * - db:run-query         — raw query runner (query tab)
 * - db:atlas-*           — MongoDB Atlas IP whitelist management
 */

const { _resolveConnection, activeClients, _closeClient } = require('./dbConfigHandlers');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build MongoDB MongoClient URI + options (supports Password & X509)
// ─────────────────────────────────────────────────────────────────────────────
function _buildMongoClientOpts(conn, extraOpts = {}) {
    let uri;
    const opts = {
        serverSelectionTimeoutMS: extraOpts.serverSelectionTimeoutMS ?? 10000,
        connectTimeoutMS: extraOpts.connectTimeoutMS ?? 10000,
        ...extraOpts,
    };

    if (conn.uri) {
        uri = conn.uri;
    } else {
        const auth = conn.username ? `${encodeURIComponent(conn.username)}:${encodeURIComponent(conn.password || '')}@` : '';
        uri = `mongodb://${auth}${conn.host}:${conn.port ?? 27017}/${conn.database ?? ''}`;
    }

    // X509 certificate auth
    if (conn.authMethod === 'x509' && conn.certPath) {
        if (!conn.uri) {
            uri = `mongodb://${conn.host}:${conn.port ?? 27017}/${conn.database ?? ''}`;
        }
        opts.tls = true;
        opts.tlsCertificateKeyFile = conn.certPath;
        opts.authMechanism = 'MONGODB-X509';
        if (conn.caPath && fs.existsSync(conn.caPath)) {
            opts.tlsCAFile = conn.caPath;
        }
        if (!conn.caPath) {
            opts.tlsAllowInvalidCertificates = true;
        }
    } else if (conn.ssl) {
        opts.tls = true;
        opts.tlsAllowInvalidCertificates = true;
    }

    return { uri, opts };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: execute a query on a fresh connection; allowAll=true skips SELECT check
// ─────────────────────────────────────────────────────────────────────────────
async function _executeReadOnlyQuery(conn, sql, allowAll = false) {
    const trimmed = sql.trim();
    if (!allowAll && conn.type !== 'mongodb' && conn.type !== 'redis') {
        const first = trimmed.split(/\s+/)[0].toUpperCase();
        const allowed = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'WITH'];
        if (!allowed.includes(first)) {
            throw new Error('Only SELECT queries are allowed in Chat mode. Use Query Runner for DML.');
        }
    }

    if (conn.type === 'mysql') {
        const mysql = require('mysql2/promise');
        const client = await mysql.createConnection({
            host: conn.host, port: conn.port || 3306,
            user: conn.username, password: conn.password,
            database: conn.database || undefined,
            connectTimeout: 15000,
            ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
        });
        const [rows, fields] = await client.query(sql);
        await client.end();
        if (!Array.isArray(rows)) {
            return { columns: [], rows: [], affectedRows: rows.affectedRows || 0 };
        }
        const columns = (fields || []).map(f => ({ name: f.name, type: f.type }));
        return { columns, rows: rows.map(r => Object.values(r).map(v => v === null ? null : String(v))) };
    }

    if (conn.type === 'pgsql') {
        const { Client } = require('pg');
        const client = new Client({
            host: conn.host, port: conn.port || 5432,
            user: conn.username, password: conn.password,
            database: conn.database || 'postgres',
            connectionTimeoutMillis: 15000,
            ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
        });
        await client.connect();
        const res = await client.query(sql);
        await client.end();
        const columns = (res.fields || []).map(f => ({ name: f.name, type: f.dataTypeID }));
        if (!res.rows || res.rows.length === 0) return { columns, rows: [], affectedRows: res.rowCount };
        return { columns, rows: res.rows.map(r => Object.values(r).map(v => v === null ? null : String(v))) };
    }

    if (conn.type === 'mongodb') {
        const { MongoClient, ObjectId } = require('mongodb');

        function _convertExtJSON(obj) {
            if (obj === null || obj === undefined) return obj;
            if (Array.isArray(obj)) return obj.map(_convertExtJSON);
            if (typeof obj !== 'object') return obj;
            if (obj.$date !== undefined) return new Date(obj.$date);
            if (obj.$oid !== undefined) return new ObjectId(obj.$oid);
            if (obj.$numberLong !== undefined) return Number(obj.$numberLong);
            if (obj.$numberInt !== undefined) return Number(obj.$numberInt);
            if (obj.$regex !== undefined) return new RegExp(obj.$regex, obj.$options || '');
            const out = {};
            for (const k of Object.keys(obj)) out[k] = _convertExtJSON(obj[k]);
            return out;
        }

        const { uri: mUri, opts: mOpts } = _buildMongoClientOpts(conn);
        const client = new MongoClient(mUri, mOpts);
        await client.connect();
        const db = client.db(conn.database || 'admin');

        let docs = [];
        let collName = '';

        try {
            const parsed = _convertExtJSON(JSON.parse(trimmed));
            collName = parsed.collection || parsed.collectionName || '';
            const coll = db.collection(collName);
            const method = (parsed.method || 'find').toLowerCase();
            const limitN = parsed.limit ?? 50;

            if (method === 'aggregate') {
                const pipeline = parsed.pipeline || parsed.stages || [];
                if (!allowAll) {
                    const unsafe = pipeline.some(s => s.$out || s.$merge);
                    if (unsafe) { await client.close(); throw new Error('$out and $merge stages are not allowed in read-only mode.'); }
                }
                docs = await coll.aggregate(pipeline).toArray();
            } else if (method === 'countDocuments' || method === 'count') {
                const count = await coll.countDocuments(parsed.filter || {});
                await client.close();
                return { columns: [{ name: 'count', type: 'number' }], rows: [[String(count)]] };
            } else {
                const projection = parsed.projection || parsed.project || {};
                const sort = parsed.sort || {};
                docs = await coll.find(parsed.filter || {}, { projection }).sort(sort).limit(limitN).toArray();
            }
        } catch (jsonErr) {
            const shellMatch = trimmed.match(/^db\.([\w]+)\.(find|aggregate|countDocuments|count)\s*\(([\\s\\S]*)\)\s*;?$/);
            if (shellMatch) {
                collName = shellMatch[1];
                const method = shellMatch[2];
                const argsStr = shellMatch[3].trim();
                const coll = db.collection(collName);

                try {
                    const args = argsStr ? _convertExtJSON(JSON.parse('[' + argsStr + ']')) : [];
                    if (method === 'aggregate') {
                        const pipeline = args[0] || [];
                        if (!allowAll) {
                            const unsafe = (Array.isArray(pipeline) ? pipeline : []).some(s => s.$out || s.$merge);
                            if (unsafe) { await client.close(); throw new Error('$out/$merge not allowed in read-only mode.'); }
                        }
                        docs = await coll.aggregate(pipeline).toArray();
                    } else if (method === 'countDocuments' || method === 'count') {
                        const count = await coll.countDocuments(args[0] || {});
                        await client.close();
                        return { columns: [{ name: 'count', type: 'number' }], rows: [[String(count)]] };
                    } else {
                        docs = await coll.find(args[0] || {}).limit(50).toArray();
                    }
                } catch (parseErr) {
                    await client.close();
                    throw new Error('Failed to parse MongoDB query arguments: ' + parseErr.message);
                }
            } else if (jsonErr.message.includes('not allowed')) {
                await client.close();
                throw jsonErr;
            } else {
                await client.close();
                throw new Error('MongoDB query must be JSON {collection, method, filter/pipeline} or shell-style db.coll.find({}). Got: ' + trimmed.substring(0, 200));
            }
        }

        await client.close();
        const keySet = new Set();
        docs.forEach(d => Object.keys(d).forEach(k => keySet.add(k)));
        const columns = Array.from(keySet).map(k => ({ name: k, type: 'any' }));
        const rows = docs.map(doc => columns.map(col => {
            const v = doc[col.name];
            if (v === undefined || v === null) return null;
            return typeof v === 'object' ? JSON.stringify(v) : String(v);
        }));
        return { columns, rows };
    }

    if (conn.type === 'redis') {
        const Redis = require('ioredis');
        const client = new Redis({
            host: conn.host, port: conn.port || 6379,
            password: conn.password || undefined,
            connectTimeout: 10000,
            tls: conn.ssl ? { rejectUnauthorized: false } : undefined,
            lazyConnect: true,
        });
        await client.connect();
        const parts = sql.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        const result = await client[cmd](...args);
        await client.quit();
        if (Array.isArray(result)) {
            return { columns: [{ name: 'value', type: 'string' }], rows: result.map(v => [String(v)]) };
        }
        return { columns: [{ name: 'result', type: 'string' }], rows: [[String(result)]] };
    }

    throw new Error('Unsupported DB type: ' + conn.type);
}

function registerHandlers(ipcMain, win) {

    // ── Test Connection ───────────────────────────────────────────────────────

    ipcMain.handle('db:test-connection', async (e, connId) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };

        try {
            if (conn.type === 'mysql') {
                const mysql = require('mysql2/promise');
                const client = await mysql.createConnection({
                    host: conn.host, port: conn.port ?? 3306,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? undefined,
                    connectTimeout: 10000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                });
                const [vRows] = await client.query('SELECT VERSION() AS ver');
                await client.end();
                return { ok: true, version: vRows[0]?.ver ?? 'unknown' };
            }

            if (conn.type === 'pgsql') {
                const { Client } = require('pg');
                const client = new Client({
                    host: conn.host, port: conn.port ?? 5432,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? 'postgres',
                    connectionTimeoutMillis: 10000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                });
                await client.connect();
                const res = await client.query('SELECT version()');
                await client.end();
                return { ok: true, version: res.rows[0]?.version ?? 'unknown' };
            }

            if (conn.type === 'mongodb') {
                const { MongoClient } = require('mongodb');
                const { uri, opts } = _buildMongoClientOpts(conn);
                const client = new MongoClient(uri, opts);
                await client.connect();
                const info = await client.db().admin().serverInfo();
                await client.close();
                return { ok: true, version: `MongoDB ${info.version}` };
            }

            if (conn.type === 'redis') {
                const Redis = require('ioredis');
                const client = new Redis({
                    host: conn.host, port: conn.port ?? 6379,
                    password: conn.password || undefined,
                    connectTimeout: 10000,
                    tls: conn.ssl ? { rejectUnauthorized: false } : undefined,
                    lazyConnect: true,
                });
                await client.connect();
                const info = await client.info('server');
                const verMatch = info.match(/redis_version:(.+)/);
                await client.quit();
                return { ok: true, version: `Redis ${(verMatch?.[1] ?? 'unknown').trim()}` };
            }

            return { ok: false, error: `Unknown type: ${conn.type}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Persistent Connect ────────────────────────────────────────────────────

    ipcMain.handle('db:connect', async (e, connId) => {
        if (activeClients.has(connId)) {
            _closeClient(connId);
        }
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };

        try {
            if (conn.type === 'mysql') {
                const mysql = require('mysql2/promise');
                const client = await mysql.createConnection({
                    host: conn.host, port: conn.port ?? 3306,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? undefined,
                    connectTimeout: 10000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                    multipleStatements: false,
                });
                activeClients.set(connId, { type: 'mysql', client });
                return { ok: true, type: 'mysql' };
            }

            if (conn.type === 'pgsql') {
                const { Client } = require('pg');
                const client = new Client({
                    host: conn.host, port: conn.port ?? 5432,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? 'postgres',
                    connectionTimeoutMillis: 10000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                });
                await client.connect();
                activeClients.set(connId, { type: 'pgsql', client });
                return { ok: true, type: 'pgsql' };
            }

            if (conn.type === 'mongodb') {
                const { MongoClient } = require('mongodb');
                const { uri, opts } = _buildMongoClientOpts(conn);
                const client = new MongoClient(uri, opts);
                await client.connect();
                activeClients.set(connId, { type: 'mongodb', client, dbName: conn.database ?? 'admin' });
                return { ok: true, type: 'mongodb' };
            }

            if (conn.type === 'redis') {
                const Redis = require('ioredis');
                const client = new Redis({
                    host: conn.host, port: conn.port ?? 6379,
                    password: conn.password || undefined,
                    connectTimeout: 10000,
                    tls: conn.ssl ? { rejectUnauthorized: false } : undefined,
                    lazyConnect: true,
                });
                await client.connect();
                activeClients.set(connId, { type: 'redis', client });
                return { ok: true, type: 'redis' };
            }

            return { ok: false, error: `Unknown type: ${conn.type}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────

    ipcMain.handle('db:disconnect', (e, connId) => {
        try {
            _closeClient(connId);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Execute Query on Persistent Connection ────────────────────────────────

    ipcMain.handle('db:execute-query', async (e, connId, query) => {
        if (!activeClients.has(connId)) return { ok: false, error: 'Not connected. Click "Connect" first.' };
        const entry = activeClients.get(connId);

        try {
            if (entry.type === 'mysql') {
                const [rows, fields] = await entry.client.query(query);
                const columns = (fields ?? []).map(f => f.name);
                const data = Array.isArray(rows) ? rows : [{ affectedRows: rows.affectedRows, insertId: rows.insertId }];
                return { ok: true, columns, rows: data, rowCount: data.length };
            }

            if (entry.type === 'pgsql') {
                const res = await entry.client.query(query);
                const columns = (res.fields ?? []).map(f => f.name);
                return { ok: true, columns, rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
            }

            if (entry.type === 'mongodb') {
                return { ok: false, error: 'MongoDB query execution via text is not supported. Use the schema browser.' };
            }

            if (entry.type === 'redis') {
                const parts = query.trim().split(/\s+/);
                const cmd = parts[0].toLowerCase();
                const args = parts.slice(1);
                const result = await entry.client.call(cmd, ...args);
                return {
                    ok: true,
                    columns: ['result'],
                    rows: [{ result: typeof result === 'object' ? JSON.stringify(result) : String(result) }],
                    rowCount: 1,
                };
            }

            return { ok: false, error: `Unknown type: ${entry.type}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Schema Introspection ──────────────────────────────────────────────────

    ipcMain.handle('db:get-schema', async (e, connId) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };

        try {
            if (conn.type === 'mysql') {
                const mysql = require('mysql2/promise');
                const client = await mysql.createConnection({
                    host: conn.host, port: conn.port ?? 3306,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? undefined,
                    connectTimeout: 10000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                });
                const targetDb = conn.database ? `'${conn.database}'` : 'DATABASE()';
                const [columns] = await client.query(`
                    SELECT c.TABLE_NAME, c.COLUMN_NAME, c.COLUMN_TYPE, c.COLUMN_KEY, c.IS_NULLABLE
                    FROM information_schema.COLUMNS c
                    WHERE c.TABLE_SCHEMA = ${targetDb}
                    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
                `);
                const [tableStats] = await client.query(`
                    SELECT TABLE_NAME, TABLE_ROWS
                    FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = ${targetDb}
                `);
                await client.end();

                const rowMap = {};
                for (const t of tableStats) rowMap[t.TABLE_NAME] = t.TABLE_ROWS ?? 0;

                const schema = {};
                for (const row of columns) {
                    if (!schema[row.TABLE_NAME]) schema[row.TABLE_NAME] = { columns: [], rows: rowMap[row.TABLE_NAME] ?? 0 };
                    schema[row.TABLE_NAME].columns.push({
                        column: row.COLUMN_NAME, type: row.COLUMN_TYPE,
                        key: row.COLUMN_KEY ?? '', nullable: row.IS_NULLABLE === 'YES',
                    });
                }
                return { ok: true, schema, type: 'mysql' };
            }

            if (conn.type === 'pgsql') {
                const { Client } = require('pg');
                const client = new Client({
                    host: conn.host, port: conn.port ?? 5432,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? 'postgres',
                    connectionTimeoutMillis: 10000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                });
                await client.connect();
                const res = await client.query(`
                    SELECT c.table_name, c.column_name, c.data_type, c.is_nullable,
                           CASE WHEN kcu.column_name IS NOT NULL THEN 'PRI' ELSE '' END AS column_key
                    FROM information_schema.columns c
                    LEFT JOIN information_schema.key_column_usage kcu
                        ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
                        AND kcu.constraint_name IN (
                            SELECT constraint_name FROM information_schema.table_constraints
                            WHERE constraint_type = 'PRIMARY KEY'
                        )
                    WHERE c.table_schema = 'public'
                    ORDER BY c.table_name, c.ordinal_position
                `);
                const rowRes = await client.query(`
                    SELECT relname AS table_name, reltuples::bigint AS row_count
                    FROM pg_class
                    WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                `);
                await client.end();

                const rowMap = {};
                for (const r of rowRes.rows) rowMap[r.table_name] = Number(r.row_count) ?? 0;

                const schema = {};
                for (const row of res.rows) {
                    if (!schema[row.table_name]) schema[row.table_name] = { columns: [], rows: rowMap[row.table_name] ?? 0 };
                    schema[row.table_name].columns.push({
                        column: row.column_name, type: row.data_type,
                        key: row.column_key ?? '', nullable: row.is_nullable === 'YES',
                    });
                }
                return { ok: true, schema, type: 'pgsql' };
            }

            if (conn.type === 'mongodb') {
                const { MongoClient } = require('mongodb');
                const { uri, opts } = _buildMongoClientOpts(conn);
                const client = new MongoClient(uri, opts);
                await client.connect();
                const db = client.db(conn.database ?? 'admin');
                const colls = await db.listCollections().toArray();

                function _inferType(val) {
                    if (val === null || val === undefined) return 'null';
                    if (val instanceof require('mongodb').ObjectId) return 'ObjectId';
                    if (val instanceof Date) return 'Date';
                    if (Array.isArray(val)) return 'Array';
                    if (typeof val === 'object') return 'Object';
                    if (typeof val === 'number') return Number.isInteger(val) ? 'Int' : 'Double';
                    if (typeof val === 'boolean') return 'Boolean';
                    return 'String';
                }

                const schema = {};
                for (const c of colls) {
                    try {
                        const stats = await db.command({ collStats: c.name, scale: 1 });
                        const samples = await db.collection(c.name).find({}).limit(5).toArray();
                        const fieldMap = {};
                        for (const doc of samples) {
                            for (const [key, val] of Object.entries(doc)) {
                                if (!fieldMap[key]) fieldMap[key] = new Set();
                                fieldMap[key].add(_inferType(val));
                            }
                        }
                        const columns = Object.entries(fieldMap).map(([name, types]) => ({
                            name, column: name,
                            type: Array.from(types).join('|'),
                            key: name === '_id' ? 'PRI' : (types.has('ObjectId') ? 'REF' : ''),
                            nullable: true,
                        }));
                        schema[c.name] = {
                            columns: columns.length > 0 ? columns : [{ column: '(empty)', name: '(empty)', type: 'BSON', key: '', nullable: true }],
                            stats: {
                                count: stats.count ?? 0, storageSize: stats.storageSize ?? 0,
                                totalIndexSize: stats.totalIndexSize ?? 0, nindexes: stats.nindexes ?? 0,
                                avgObjSize: stats.avgObjSize ?? 0, capped: stats.capped ?? false, size: stats.size ?? 0,
                            }
                        };
                    } catch {
                        schema[c.name] = {
                            columns: [{ column: '(document)', name: '(document)', type: 'BSON', key: '', nullable: true }],
                            stats: { count: 0, storageSize: 0, totalIndexSize: 0, nindexes: 0, avgObjSize: 0, capped: false, size: 0 }
                        };
                    }
                }
                await client.close();
                return { ok: true, schema, type: 'mongodb' };
            }

            if (conn.type === 'redis') {
                const Redis = require('ioredis');
                const client = new Redis({
                    host: conn.host, port: conn.port ?? 6379,
                    password: conn.password || undefined,
                    connectTimeout: 10000,
                    tls: conn.ssl ? { rejectUnauthorized: false } : undefined,
                    lazyConnect: true,
                });
                await client.connect();
                const totalKeys = await client.dbsize();
                const keys = await client.scan(0, 'COUNT', 100);
                await client.quit();
                const schema = { 'keyspace': [{ column: `~${totalKeys} keys`, type: 'Redis Key', key: '', nullable: false }] };
                for (const k of (keys[1] ?? [])) {
                    schema[k] = [{ column: 'value', type: 'Redis Value', key: '', nullable: false }];
                }
                return { ok: true, schema, type: 'redis', totalKeys };
            }

            return { ok: false, error: `Unknown type: ${conn.type}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Browse Table Data (paginated) ─────────────────────────────────────────

    ipcMain.handle('db:browse-table', async (e, { connId, tableName, page = 1, pageSize = 50, filter = '' }) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };
        const offset = (page - 1) * pageSize;

        try {
            if (conn.type === 'mysql') {
                const mysql = require('mysql2/promise');
                const client = await mysql.createConnection({
                    host: conn.host, port: conn.port ?? 3306,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? undefined,
                    connectTimeout: 15000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                });
                const safeTable = '`' + tableName.replace(/`/g, '``') + '`';
                const whereClause = filter ? ` WHERE ${filter}` : '';
                const [[{ total }]] = await client.query(`SELECT COUNT(*) AS total FROM ${safeTable}${whereClause}`);
                const [rows, fields] = await client.query(`SELECT * FROM ${safeTable}${whereClause} LIMIT ? OFFSET ?`, [pageSize, offset]);
                await client.end();
                const columns = (fields ?? []).map(f => ({ name: f.name, type: f.type }));
                const totalPages = Math.max(1, Math.ceil(Number(total) / pageSize));
                return { ok: true, columns, rows: rows.map(r => Object.values(r).map(v => v === null ? null : String(v))), total: Number(total), page, pageSize, totalPages };
            }

            if (conn.type === 'pgsql') {
                const { Client } = require('pg');
                const client = new Client({
                    host: conn.host, port: conn.port ?? 5432,
                    user: conn.username, password: conn.password,
                    database: conn.database ?? 'postgres',
                    connectionTimeoutMillis: 15000,
                    ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
                });
                await client.connect();
                const safeTable = `"${tableName.replace(/"/g, '""')}"`;
                const whereClause = filter ? ` WHERE ${filter}` : '';
                const countRes = await client.query(`SELECT COUNT(*) AS total FROM ${safeTable}${whereClause}`);
                const total = Number(countRes.rows[0]?.total ?? 0);
                const res = await client.query(`SELECT * FROM ${safeTable}${whereClause} LIMIT $1 OFFSET $2`, [pageSize, offset]);
                await client.end();
                const columns = (res.fields ?? []).map(f => ({ name: f.name, type: f.dataTypeID }));
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                return { ok: true, columns, rows: res.rows.map(r => Object.values(r).map(v => v === null ? null : String(v))), total, page, pageSize, totalPages };
            }

            if (conn.type === 'mongodb') {
                const { MongoClient } = require('mongodb');
                const { uri, opts } = _buildMongoClientOpts(conn);
                const client = new MongoClient(uri, opts);
                await client.connect();
                const db = client.db(conn.database ?? 'admin');
                const coll = db.collection(tableName);
                const filterObj = filter ? (() => { try { return JSON.parse(filter); } catch { return {}; } })() : {};
                const total = await coll.countDocuments(filterObj);
                const docs = await coll.find(filterObj).skip(offset).limit(pageSize).toArray();
                await client.close();
                const keySet = new Set();
                docs.forEach(doc => Object.keys(doc).forEach(k => keySet.add(k)));
                const columns = Array.from(keySet).map(k => ({ name: k, type: 'any' }));
                const rows = docs.map(doc => columns.map(col => {
                    const v = doc[col.name];
                    if (v === undefined || v === null) return null;
                    if (typeof v === 'object') return JSON.stringify(v);
                    return String(v);
                }));
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                return { ok: true, columns, rows, total, page, pageSize, totalPages };
            }

            if (conn.type === 'redis') {
                const Redis = require('ioredis');
                const client = new Redis({
                    host: conn.host, port: conn.port ?? 6379,
                    password: conn.password || undefined,
                    connectTimeout: 10000,
                    tls: conn.ssl ? { rejectUnauthorized: false } : undefined,
                    lazyConnect: true,
                });
                await client.connect();
                const total = await client.dbsize();
                const pattern = tableName === 'keyspace' ? (filter || '*') : tableName;
                let cursor = '0';
                const allKeys = [];
                do {
                    const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
                    cursor = newCursor;
                    allKeys.push(...keys);
                } while (cursor !== '0' && allKeys.length < pageSize * page + 100);

                const pageKeys = allKeys.slice(offset, offset + pageSize);
                const rows = [];
                for (const key of pageKeys) {
                    const type = await client.type(key);
                    let value = '';
                    try {
                        if (type === 'string') value = await client.get(key);
                        else if (type === 'hash') value = JSON.stringify(await client.hgetall(key));
                        else if (type === 'list') value = JSON.stringify(await client.lrange(key, 0, 19));
                        else if (type === 'set') value = JSON.stringify(await client.smembers(key));
                        else if (type === 'zset') value = JSON.stringify(await client.zrange(key, 0, 19, 'WITHSCORES'));
                        else value = `(${type})`;
                    } catch { value = '(error reading)'; }
                    const ttl = await client.ttl(key);
                    rows.push([key, type, value, ttl === -1 ? '∞' : String(ttl)]);
                }
                await client.quit();
                const columns = [{ name: 'key', type: 'string' }, { name: 'type', type: 'string' }, { name: 'value', type: 'string' }, { name: 'ttl(s)', type: 'number' }];
                const totalPages = Math.max(1, Math.ceil(allKeys.length / pageSize));
                return { ok: true, columns, rows, total: allKeys.length, page, pageSize, totalPages };
            }

            return { ok: false, error: `Unsupported db type: ${conn.type}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Chat with DB (AI-powered query) ───────────────────────────────────────

    ipcMain.handle('db:chat-query', async (e, { connId, question, schema, generateOnly = false }) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };
        const ai = require('../../services/aiProvider'); // ← updated path

        let schemaContext = '';
        try {
            const s = JSON.parse(schema || '{}');
            if (Array.isArray(s)) {
                schemaContext = s.slice(0, 50).map(t => {
                    const cols = (t.columns || []).map(c =>
                        c.name + ':' + (c.type || 'str') + (c.key === 'PRI' ? '[PK]' : c.key === 'MUL' ? '[FK]' : '')
                    ).join(', ');
                    return t.name + '(' + cols + ')';
                }).join('\n');
            } else if (s && typeof s === 'object') {
                const tableNames = Object.keys(s);
                schemaContext = tableNames.slice(0, 60).map(tbl => {
                    const entry = s[tbl];
                    const cols = Array.isArray(entry) ? entry : (entry.columns || []);
                    const rowCount = Array.isArray(entry) ? null : (entry.rows || entry.stats?.count || null);
                    const colDefs = cols.map(c => {
                        const fieldName = c.name || c.column || '?';
                        let def = fieldName + ':' + (c.type || 'str');
                        if (c.key === 'PRI') def += '[PK]';
                        else if (c.key === 'REF') def += '[REF]';
                        else if (c.key === 'MUL') def += '[FK]';
                        else if (c.key === 'UNI') def += '[UNI]';
                        if (c.nullable === 'NO' || c.nullable === false) def += '[NN]';
                        return def;
                    }).join(', ');
                    const rowHint = rowCount != null ? ' -- ~' + Number(rowCount).toLocaleString() + ' rows' : '';
                    return tbl + '(' + colDefs + ')' + rowHint;
                }).join('\n');
            }
        } catch (_e) {}

        const dbTypeName = { mysql: 'MySQL', pgsql: 'PostgreSQL', mongodb: 'MongoDB', redis: 'Redis' }[conn.type] || conn.type;
        const isMongoDb = conn.type === 'mongodb';
        const now = new Date().toISOString().split('T')[0];

        // ── Build prompt ────────────────────────────────────────────────────────
        let prompt;
        if (isMongoDb) {
            const dmNote = generateOnly
                ? 'Generate a MongoDB query to answer this. It can be read or write. Set isDml=true for write operations.'
                : 'RULES:\n' +
                  '1) Generate a READ-ONLY MongoDB query. Set isDml=false.\n' +
                  '2) If the user asks to MODIFY data (update/delete/insert) - set isDml=true, write the query, do NOT execute.\n' +
                  '3) Write "explanation" as a DIRECT conversational answer in the same language as the question. Do NOT say "To find..." - just answer.\n' +
                  '4) Use EXACT field names from the schema. Do NOT guess or invent field names.\n' +
                  '5) For dates: use ISO strings directly like "2026-02-01T00:00:00.000Z" — NOT $date wrappers.\n' +
                  '6) Fields tagged [REF] are ObjectId references to _id in another collection. NEVER fabricate/guess ObjectId values.\n' +
                  '7) When the user references a value (like username) but the target collection stores ObjectIds, use $lookup to resolve the reference.\n' +
                  '   EFFICIENT PATTERN — start from the SMALL collection, $lookup into the LARGE one:\n' +
                  '   Example: "how many matches did username X play?" → start from "users", $match username, then $lookup into "matches":\n' +
                  '   pipeline: [{$match:{username:"X"}},{$lookup:{from:"matches",let:{uid:"$_id"},pipeline:[{$match:{$expr:{$or:[{$eq:["$playerA","$$uid"]},{$eq:["$playerB","$$uid"]}]}}}],as:"m"}},{$project:{total:{$size:"$m"}}}]\n' +
                  '8) For simple queries on a single collection (no cross-ref needed), use countDocuments or find directly.';

            prompt = 'You are a friendly MongoDB database assistant.\n' +
                'Today\'s date: ' + now + '\n' +
                'Database: "' + (conn.database || conn.name) + '"\n' +
                'Collections (name(field:type[flags]) -- count):\n' + (schemaContext || '(no schema)') + '\n\n' +
                'User question: "' + question + '"\n\n' +
                dmNote + '\n\n' +
                'CRITICAL: Respond with a SINGLE valid JSON object. NO markdown fences. NO text outside the JSON.\n' +
                'Use this EXACT format (query params as top-level fields, NOT inside a "sql" string):\n' +
                '{\n' +
                '  "explanation": "<direct answer>",\n' +
                '  "collection": "<starting collection name>",\n' +
                '  "method": "find|aggregate|countDocuments",\n' +
                '  "filter": {},\n' +
                '  "pipeline": [],\n' +
                '  "limit": 50,\n' +
                '  "isDml": false\n' +
                '}\n' +
                'For "find": use "filter" and optional "limit". For "aggregate": use "pipeline" array. For "countDocuments": use "filter".';
        } else {
            const dmNote = generateOnly
                ? 'Generate a SQL query to answer this. It can be any type. Set isDml=true for non-SELECT queries.'
                : 'RULES:\n' +
                  '1) Generate a READ-ONLY SQL query. Set isDml=false.\n' +
                  '2) If the user asks to MODIFY data (UPDATE/DELETE/INSERT) - set isDml=true, generate the query, do NOT execute.\n' +
                  '3) Write "explanation" as a DIRECT conversational answer in the same language as the question. Do NOT say "To find..." - just answer.\n' +
                  '4) Use EXACT column names from the schema. Do NOT guess or invent column names.\n' +
                  '5) For JOINs, verify foreign key columns exist in the schema before using them.';

            prompt = 'You are a friendly ' + dbTypeName + ' database assistant.\n' +
                'Today\'s date: ' + now + '\n' +
                'Database: "' + (conn.database || conn.name) + '"\n' +
                'Schema (table_name(col:type[flags]) -- row count):\n' + (schemaContext || '(no schema)') + '\n\n' +
                'User question: "' + question + '"\n\n' +
                dmNote + '\n\n' +
                'CRITICAL: Respond ONLY with a single valid JSON object (no markdown fences, no extra text):\n' +
                '{"explanation":"<direct answer>","sql":"<the SQL query>","isDml":false}';
        }

        const aiResult = await ai.analyze(prompt, { maxTokens: 8192 });
        if (!aiResult.ok) return { ok: false, error: aiResult.error };

        // ── Parse AI response ────────────────────────────────────────────────
        let parsed;
        try {
            let raw = aiResult.analysis
                .replace(/```(?:json|sql|javascript|js)?\n?/gi, '')
                .replace(/```\n?/g, '')
                .trim();
            function _tryParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }

            parsed = _tryParse(raw);
            if (!parsed) {
                const fb = raw.indexOf('{'), lb = raw.lastIndexOf('}');
                if (fb >= 0 && lb > fb) parsed = _tryParse(raw.slice(fb, lb + 1));
            }
            if (!parsed) {
                const explM = raw.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                const dmlM = raw.match(/"isDml"\s*:\s*(true|false)/);
                if (explM) {
                    parsed = {
                        explanation: explM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                        isDml: dmlM ? dmlM[1] === 'true' : false
                    };
                    if (!isMongoDb) {
                        const sqlM = raw.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        if (sqlM) parsed.sql = sqlM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                    }
                    if (isMongoDb) {
                        const collM = raw.match(/"collection"\s*:\s*"([^"]*)"/);
                        const methM = raw.match(/"method"\s*:\s*"([^"]*)"/);
                        if (collM) parsed.collection = collM[1];
                        if (methM) parsed.method = methM[1];
                    }
                }
            }
            if (!parsed && !isMongoDb) {
                const origRaw = aiResult.analysis || '';
                const sqlFenceM = origRaw.match(/```sql\s*\n?([\s\S]*?)(?:```|$)/i);
                const nakedSqlM = !sqlFenceM ? origRaw.match(/\b((?:SELECT|WITH)\b[\s\S]{10,})$/i) : null;
                const extractedSql = sqlFenceM ? sqlFenceM[1].trim() : (nakedSqlM ? nakedSqlM[1].trim() : '');
                if (extractedSql) {
                    const sqlStart = sqlFenceM ? origRaw.indexOf(sqlFenceM[0]) : origRaw.indexOf(nakedSqlM[0]);
                    const explanationText = origRaw.substring(0, sqlStart).replace(/```[a-z]*\n?/gi, '').trim();
                    parsed = {
                        explanation: explanationText || 'AI generated a query.',
                        sql: extractedSql,
                        isDml: /^\s*(UPDATE|DELETE|INSERT|DROP|ALTER|TRUNCATE|CREATE|REPLACE)/i.test(extractedSql),
                    };
                }
            }
            if (!parsed) {
                const text = (aiResult.analysis || '').replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
                if (text.length > 20) {
                    parsed = { explanation: text.substring(0, 500), sql: '', isDml: false };
                }
            }
            if (!parsed) return { ok: false, error: 'AI returned unparseable response. Raw: ' + (aiResult.analysis || '').substring(0, 400) };
        } catch (_outerE) {
            return { ok: false, error: 'AI parse error: ' + _outerE.message };
        }

        const explanation = parsed.explanation || '';

        function _fmtNum(v) {
            const n = Number(v);
            if (isNaN(n)) return String(v);
            return n.toLocaleString('id-ID', { maximumFractionDigits: 6 });
        }

        // ── MongoDB: build query from top-level fields ─────────────────────
        if (isMongoDb) {
            const isDml = !!parsed.isDml;
            const collection = parsed.collection || '';
            const method = (parsed.method || 'find').toLowerCase();
            const displayQuery = JSON.stringify({ collection, method, ...(parsed.pipeline ? { pipeline: parsed.pipeline } : {}), ...(parsed.filter ? { filter: parsed.filter } : {}), ...(parsed.limit ? { limit: parsed.limit } : {}) });

            if (!collection) return { ok: true, explanation: explanation || 'AI did not specify a collection.', sql: '', isDml: false, rows: [], columns: [] };
            if (generateOnly || isDml) return { ok: true, explanation, sql: displayQuery, isDml: true, rows: null, columns: null };

            try {
                const execResult = await _executeReadOnlyQuery(conn, JSON.stringify({
                    collection, method,
                    pipeline: parsed.pipeline || [],
                    filter: parsed.filter || {},
                    limit: parsed.limit ?? 50
                }));

                let finalExplanation = explanation;
                if (execResult.rows && execResult.rows.length === 1 && execResult.rows[0].length === 1) {
                    finalExplanation = explanation + ' The answer is: **' + _fmtNum(execResult.rows[0][0]) + '**';
                } else if (execResult.rows && execResult.rows.length > 0) {
                    finalExplanation = explanation + ' (' + execResult.rows.length + ' row' + (execResult.rows.length !== 1 ? 's' : '') + ' returned)';
                } else if (execResult.rows && execResult.rows.length === 0) {
                    finalExplanation = explanation + ' (No rows found)';
                }
                return { ok: true, explanation: finalExplanation, sql: displayQuery, isDml: false, ...execResult };
            } catch (err) {
                return { ok: true, explanation, sql: displayQuery, isDml: false, rows: [], columns: [], execError: err.message };
            }
        }

        // ── SQL databases ──────────────────────────────────────────────────
        const sql = parsed.sql || '';
        const isDml = parsed.isDml || /^\s*(UPDATE|DELETE|INSERT|DROP|ALTER|TRUNCATE|CREATE|REPLACE)/i.test(sql);

        if (!sql) return { ok: true, explanation: explanation || 'AI did not generate a query.', sql: '', isDml: false, rows: [], columns: [] };
        if (generateOnly || isDml) return { ok: true, explanation, sql, isDml: true, rows: null, columns: null };

        try {
            const execResult = await _executeReadOnlyQuery(conn, sql);
            let finalExplanation = explanation;
            if (execResult.rows && execResult.rows.length === 1 && execResult.rows[0].length === 1) {
                finalExplanation = explanation + ' The answer is: **' + _fmtNum(execResult.rows[0][0]) + '**';
            } else if (execResult.rows && execResult.rows.length > 0) {
                finalExplanation = explanation + ' (' + execResult.rows.length + ' row' + (execResult.rows.length !== 1 ? 's' : '') + ' returned)';
            } else if (execResult.rows && execResult.rows.length === 0) {
                finalExplanation = explanation + ' (No rows found)';
            }
            return { ok: true, explanation: finalExplanation, sql, isDml: false, ...execResult };
        } catch (err) {
            return { ok: true, explanation, sql, isDml: false, results: [], columns: [], execError: err.message };
        }
    });

    // ── Run Query (Query Runner tab) ──────────────────────────────────────────

    ipcMain.handle('db:run-query', async (e, { connId, sql }) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };
        if (!sql || !sql.trim()) return { ok: false, error: 'Empty query.' };
        try {
            const result = await _executeReadOnlyQuery(conn, sql, true);
            return { ok: true, ...result };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── MongoDB Atlas IP Whitelist ─────────────────────────────────────────────

    ipcMain.handle('db:atlas-get-whitelist', async (e, connId) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };
        if (conn.type !== 'mongodb') return { ok: false, error: 'Atlas operations only available for MongoDB.' };
        if (!conn.atlasPublicKey || !conn.atlasPrivateKey || !conn.atlasProjectId) {
            return { ok: false, error: 'Atlas API keys not configured.' };
        }
        try {
            const { default: DigestAuth } = require('@mhoc/axios-digest-auth');
            const digest = new DigestAuth({ username: conn.atlasPublicKey, password: conn.atlasPrivateKey });
            const url = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${conn.atlasProjectId}/accessList`;
            const result = await digest.request({ method: 'GET', url, headers: { Accept: 'application/vnd.atlas.2023-02-01+json' } });
            return { ok: true, entries: result.data?.results ?? [] };
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
            return { ok: false, error: msg };
        }
    });

    ipcMain.handle('db:atlas-add-ip', async (e, connId, { ips, comment }) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };
        try {
            const { default: DigestAuth } = require('@mhoc/axios-digest-auth');
            const digest = new DigestAuth({ username: conn.atlasPublicKey, password: conn.atlasPrivateKey });
            const url = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${conn.atlasProjectId}/accessList`;

            const listResult = await digest.request({ method: 'GET', url, headers: { Accept: 'application/vnd.atlas.2023-02-01+json' } });
            const currentEntries = listResult.data?.results ?? [];
            const currentIPs = new Set(currentEntries.map(e => e.ipAddress || e.cidrBlock));

            const toAdd = (ips ?? []).filter(ip => {
                const cidr = ip.includes('/') ? ip : `${ip}/32`;
                const plain = ip.replace('/32', '');
                return !currentIPs.has(cidr) && !currentIPs.has(plain);
            });

            if (toAdd.length === 0) {
                return { ok: true, skipped: true, reason: `All IPs already in access list: [${(ips ?? []).join(', ')}]` };
            }

            const body = toAdd.map(ip => ({
                ipAddress: ip.includes('/') ? undefined : ip,
                cidrBlock: ip.includes('/') ? ip : undefined,
                comment: comment || `Auto-update ${new Date().toISOString().slice(0, 10)}`,
            }));

            await digest.request({
                method: 'POST', url,
                headers: { Accept: 'application/vnd.atlas.2023-02-01+json', 'Content-Type': 'application/json' },
                data: body,
            });

            return { ok: true, skipped: false, changes: toAdd.map(ip => `+ Added ${ip}`) };
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Cleanup on app quit ───────────────────────────────────────────────────
    const { app } = require('electron');
    app.on('before-quit', () => {
        for (const [id] of activeClients) {
            _closeClient(id);
        }
    });
}

module.exports = { registerHandlers };
