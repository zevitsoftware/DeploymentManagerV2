import { create } from 'zustand'
import { toast } from './useAppStore'

const api = () => window.api

const useDatabaseStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  connections:      [],
  selectedConnId:   null,
  schema:           null,
  lastDiagnostics:  null,
  selectedTable:    null,
  activeTab:        'schema', // 'schema' | 'chat' | 'query'
  chatMessages:     [],
  chatInput:        '',
  isAiAnalyzing:    false,
  aiAnalysisResult: null,
  isLoadingSchema:  false,
  isChatLoading:    false,
  queryText:        'SELECT * FROM users LIMIT 10;',
  queryResult:      null,
  isRunningQuery:   false,
  isRunningDiagnostics: false,
  backupDir:        '',
  isRunningBackup:  false,
  backupLog:        [],

  // ─── Derived ──────────────────────────────────────────────────────────────
  get selectedConnection() {
    const { connections, selectedConnId } = get()
    return connections.find(c => c.id === selectedConnId) ?? null
  },

  // ─── Actions ─────────────────────────────────────────────────────────────

  _updateConnStatus: (id, status) => {
    set(s => ({ connections: s.connections.map(c => c.id === id ? { ...c, status } : c) }))
  },

  loadConnections: async () => {
    try {
      const connections = await api().db.getConnections()
      set({ connections: connections ?? [] })
    } catch (err) {
      toast.error('Failed to load connections: ' + err.message)
    }
  },

  // Just selects the connection — does NOT connect
  selectConnId: (id) => {
    const conn = get().connections.find(c => c.id === id)
    const isAlreadyConnected = conn?.status === 'connected' || conn?.status === 'online'
    const dbType = conn?.type ?? 'mysql'
    const defaultQuery = dbType === 'mongodb'
      ? 'db.collection.find({}).limit(10)'
      : dbType === 'redis'
        ? 'KEYS *'
        : 'SELECT * FROM users LIMIT 10;'

    set({
      selectedConnId: id,
      schema: isAlreadyConnected ? get().schema : null,
      selectedTable: isAlreadyConnected ? get().selectedTable : null,
      chatMessages: isAlreadyConnected ? get().chatMessages : [],
      chatInput: isAlreadyConnected ? get().chatInput : '',
      isChatLoading: false,
      queryText: defaultQuery,
      queryResult: isAlreadyConnected ? get().queryResult : null,
      lastDiagnostics: isAlreadyConnected ? get().lastDiagnostics : null,
      aiAnalysisResult: isAlreadyConnected ? get().aiAnalysisResult : null,
    })
  },

  selectConnection: async (id) => {
    // Determine DB-appropriate default query text
    const conn = get().connections.find(c => c.id === id)
    const dbType = conn?.type ?? 'mysql'
    const defaultQuery = dbType === 'mongodb'
      ? 'db.collection.find({}).limit(10)'
      : dbType === 'redis'
        ? 'KEYS *'
        : 'SELECT * FROM users LIMIT 10;'
    set({
      selectedConnId: id,
      schema: null,
      selectedTable: null,
      chatMessages: [],
      chatInput: '',
      isChatLoading: false,
      queryText: defaultQuery,
      queryResult: null,
      lastDiagnostics: null,
      aiAnalysisResult: null,
    })
    await get().fetchSchema(id)
  },

  selectTable: (name) => set({ selectedTable: name }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  testConnection: async (id) => {
    try {
      const res = await api().db.testConnection(id)
      if (res?.ok) get()._updateConnStatus(id, 'connected')
      else get()._updateConnStatus(id, 'error')
      return res
    } catch (err) {
      get()._updateConnStatus(id, 'error')
      return { ok: false, error: err.message }
    }
  },

  fetchSchema: async (id) => {
    try {
      set({ isLoadingSchema: true })
      const connId = id ?? get().selectedConnId
      const res = await api().db.getSchema(connId)
      if (res?.ok && res.schema) {
        // Backend returns { ok, schema: { tableName: { columns: [{column,type,key,nullable}], rows?, stats? } }, type }
        // Transform to items array the UI expects
        const rawSchema = res.schema
        const items = Object.entries(rawSchema).map(([name, data]) => {
          const cols = Array.isArray(data) ? data : (data.columns ?? [])
          const rowCount = Array.isArray(data) ? null : (data.rows ?? data.stats?.count ?? 0)
          return {
            name,
            engine: res.type ?? '—',
            rows: rowCount ?? 0,
            columns: cols.length,
            size: data.stats ? `${((data.stats.storageSize ?? data.stats.size ?? 0) / 1024).toFixed(1)}KB` : '—',
            collation: '—',
            columnDetails: cols.map(c => ({
              name: c.column ?? c.name ?? '?',
              type: c.type ?? '?',
              key: c.key ?? '',
              nullable: c.nullable ?? true,
              default: c.default ?? '',
            }))
          }
        })
        const totalRows = items.reduce((s, t) => s + (t.rows ?? 0), 0)
        set({
          schema: {
            type: res.type,
            items,
            summary: { tables: items.length, totalRows, totalSize: `${items.length} tables` },
            _raw: rawSchema, // Keep raw for AI chat context
          },
          isLoadingSchema: false,
        })
        get()._updateConnStatus(connId, 'connected')
      } else {
        toast.error(res?.error ?? 'Failed to fetch schema')
        get()._updateConnStatus(connId, 'error')
        set({ isLoadingSchema: false })
      }
    } catch (err) {
      toast.error(err.message)
      set({ isLoadingSchema: false })
    }
  },

  runDiagnostics: async (id) => {
    try {
      set({ isRunningDiagnostics: true })
      const res = await api().db.runDiagnostics(id ?? get().selectedConnId)
      if (res?.ok) {
        // Backend returns { ok, type, version, checks: [{id, label, status, detail, fix?}] }
        set({ lastDiagnostics: res })
      } else toast.error(res?.error ?? 'Diagnostics failed')
    } catch (err) { toast.error(err.message) }
    finally { set({ isRunningDiagnostics: false }) }
  },

  runAiAnalysis: async (id) => {
    try {
      const connId = id ?? get().selectedConnId
      set({ isAiAnalyzing: true, aiAnalysisResult: null })

      // First run diagnostics to get current health checks
      const diagRes = await api().db.runDiagnostics(connId)
      if (diagRes?.ok) set({ lastDiagnostics: diagRes })

      const conn = get().connections.find(c => c.id === connId)
      // Backend expects { connName, dbType, version, checks }
      const res = await api().db.aiAnalyze({
        connName: conn?.name ?? 'Unknown',
        dbType: diagRes?.type ?? conn?.type ?? 'unknown',
        version: diagRes?.version ?? '',
        checks: diagRes?.checks ?? [],
      })
      if (res?.ok) {
        set({
          isAiAnalyzing: false,
          aiAnalysisResult: { analysis: res.analysis ?? res.markdown ?? res.result ?? '', provider: res.provider, model: res.model }
        })
      } else {
        toast.error(res?.error ?? 'AI analysis failed')
        set({ isAiAnalyzing: false })
      }
    } catch (err) {
      toast.error(err.message)
      set({ isAiAnalyzing: false })
    }
  },

  sendChatMessage: async (message) => {
    const userMsg = { id: Date.now(), role: 'user', content: message, ts: Date.now() }
    set(s => ({ chatMessages: [...s.chatMessages, userMsg], isChatLoading: true }))
    try {
      // Backend expects { connId, question, schema, generateOnly }
      const schemaRaw = get().schema?._raw ?? null
      const res = await api().db.chatQuery({
        connId: get().selectedConnId,
        question: message,
        schema: schemaRaw ? JSON.stringify(schemaRaw) : null,
      })
      const botMsg = {
        id: Date.now() + 1, role: 'assistant', ts: Date.now(),
        content: res?.explanation ?? res?.answer ?? res?.markdown ?? 'No response.',
        queryResult: res?.rows ? { columns: (res.columns ?? []).map(c => c.name ?? c), rows: res.rows } : null,
        sql: res?.sql ?? null,
      }
      set(s => ({ chatMessages: [...s.chatMessages, botMsg], isChatLoading: false }))
    } catch (err) {
      const errMsg = { id: Date.now() + 1, role: 'assistant', ts: Date.now(), content: `Error: ${err.message}` }
      set(s => ({ chatMessages: [...s.chatMessages, errMsg], isChatLoading: false }))
    }
  },

  setChatInput: (v) => set({ chatInput: v }),
  clearChat: () => set({ chatMessages: [] }),

  setQueryText: (v) => set({ queryText: v }),

  runQuery: async (text) => {
    try {
      set({ isRunningQuery: true, queryResult: null })
      const t0 = Date.now()
      const res = await api().db.runQuery({ connId: get().selectedConnId, sql: text ?? get().queryText })
      const elapsed = Date.now() - t0
      if (res?.ok) {
        // Backend returns { ok, columns: [...], rows: [[...], ...] }
        // UI expects { columns, rows: [{col:val}...], rowCount, time }
        const columns = (res.columns ?? []).map(c => c.name ?? c)
        const rawRows = res.rows ?? []
        // Convert array-of-arrays to array-of-objects if needed
        const rows = rawRows.map(row => {
          if (Array.isArray(row)) {
            const obj = {}
            columns.forEach((c, i) => { obj[c] = row[i] })
            return obj
          }
          return row
        })
        set({ queryResult: { columns, rows, rowCount: rows.length, time: elapsed }, isRunningQuery: false })
      } else { toast.error(res?.error ?? 'Query failed'); set({ isRunningQuery: false }) }
    } catch (err) {
      toast.error(err.message)
      set({ isRunningQuery: false })
    }
  },

  saveConnection: async (conn) => {
    try {
      const res = await api().db.saveConnection(conn)
      if (res?.ok) await get().loadConnections()
      else toast.error(res?.error ?? 'Failed to save connection')
    } catch (err) { toast.error(err.message) }
  },

  deleteConnection: async (id) => {
    try {
      await api().db.deleteConnection(id)
      await get().loadConnections()
    } catch (err) { toast.error(err.message) }
  },

  runBackup: async (id, dir) => {
    const connId = id ?? get().selectedConnId
    const backupDir = dir ?? get().backupDir
    set({ isRunningBackup: true, backupLog: [] })

    // Subscribe to progress events
    const unsub = api().db.onBackupProgress((data) => {
      set(s => ({ backupLog: [...s.backupLog, typeof data === 'string' ? data : data?.message ?? JSON.stringify(data)] }))
    })

    try {
      const res = await api().db.runBackup({ connId, dir: backupDir })
      if (!res?.ok) toast.error(res?.error ?? 'Backup failed')
      else toast.success('Backup completed!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      unsub()
      set({ isRunningBackup: false })
    }
  },

  setBackupDir: (dir) => set({ backupDir: dir }),
}))

export default useDatabaseStore
