import { useEffect, useState, useRef, useCallback } from 'react'
import useDatabaseStore from '../../stores/useDatabaseStore'
import { toast } from '../../stores/useAppStore'
import { StatusBadge, TypeBadge } from '../../components/common/StatusBadge'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer'
import { BackupPanel } from '../../components/common/BackupPanel'
import { useResizablePanel } from '../../hooks/useResizablePanel'
import { DB_TYPES } from '../../lib/constants'
import {
  Database, Plus, Trash2, TestTube, RefreshCw, Pencil,
  ChevronDown, ChevronRight, Bot, Send, X, Lock, Copy, Check,
  HardDrive, Settings, Globe, AlertTriangle, Play
} from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Connection Form Modal ────────────────────────────────────────────────────
function ConnectionFormModal({ conn, onSave, onClose }) {
  const PORT_MAP = { mysql: 3306, postgres: 5432, mongodb: 27017, redis: 6379 }
  const [form, setForm] = useState(conn ?? {
    name:'', type:'mysql', host:'localhost', port:3306,
    username:'root', password:'', database:'',
    uri:'', ssl:false, authMethod:'password', certPath:'', caPath:''
  })
  const isMongo = form.type === 'mongodb'
  const isRedis = form.type === 'redis'
  const isX509  = isMongo && form.authMethod === 'x509'
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const browseFile = async (field) => {
    try {
      const res = await window.api?.dialog?.open({
        title: field === 'certPath' ? 'Select X.509 Certificate' : 'Select CA Certificate',
        filters: [{ name: 'PEM', extensions: ['pem','crt','key'] }, { name: 'All', extensions: ['*'] }],
        properties: ['openFile'],
      })
      const p = res?.filePaths?.[0]
      if (p) f(field, p)
    } catch(_) {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base sticky top-0 bg-bg-surface z-10">
          <h3 className="font-semibold text-text-primary">{conn ? 'Edit Connection' : 'Add Connection'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16}/></button>
        </div>
        <form onSubmit={e=>{e.preventDefault();onSave(form);onClose()}} className="p-5 space-y-3">
          {/* DB Type */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Database Type</label>
            <select value={form.type} onChange={e=>{const t=e.target.value;setForm(p=>({...p,type:t,port:PORT_MAP[t]??p.port,authMethod:'password'}))}}
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none">
              {Object.entries(DB_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Connection Name</label>
            <input required value={form.name} placeholder="e.g. Production MySQL" onChange={e=>f('name',e.target.value)}
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
          </div>
          {/* URI — MongoDB only */}
          {isMongo && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Connection URI <span className="text-text-dim">(overrides host/port)</span></label>
              <input value={form.uri??''} placeholder="mongodb+srv://<user>:<password>@<cluster-host>/<database>" onChange={e=>f('uri',e.target.value)}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim font-mono text-xs"/>
            </div>
          )}
          {/* Host + Port */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Host</label>
              <input value={form.host??''} placeholder="localhost" onChange={e=>f('host',e.target.value)}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Port</label>
              <input value={form.port??''} type="number" placeholder={String(PORT_MAP[form.type]??'')} onChange={e=>f('port',parseInt(e.target.value)||PORT_MAP[form.type])}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none"/>
            </div>
          </div>
          {/* Database Name — not for Redis */}
          {!isRedis && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Database Name</label>
              <input value={form.database??''} placeholder="app_db" onChange={e=>f('database',e.target.value)}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
            </div>
          )}
          {/* Auth Method — MongoDB only */}
          {isMongo && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Auth Method</label>
              <select value={form.authMethod??'password'} onChange={e=>f('authMethod',e.target.value)}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none">
                <option value="password">Password</option>
                <option value="x509">X.509 Certificate</option>
              </select>
            </div>
          )}
          {/* Username + Password (hidden for X.509) */}
          {!isX509 && (
            <div className="grid grid-cols-2 gap-2">
              {!isRedis && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Username</label>
                  <input value={form.username??''} placeholder="root" onChange={e=>f('username',e.target.value)}
                    className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
                </div>
              )}
              <div className={isRedis?'col-span-2':''}>
                <label className="block text-xs font-medium text-text-muted mb-1">Password{isRedis && <span className="text-text-dim ml-1">(optional)</span>}</label>
                <input value={form.password??''} type="password" placeholder="••••••" onChange={e=>f('password',e.target.value)}
                  className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
              </div>
            </div>
          )}
          {/* X.509 Cert / CA file paths */}
          {isX509 && [['certPath','X.509 Certificate (.pem)'],['caPath','CA Certificate (.pem)']].map(([field,label])=>(
            <div key={field}>
              <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
              <div className="flex gap-2">
                <input value={form[field]??''} readOnly placeholder="Click Browse…"
                  className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-xs text-text-primary outline-none placeholder:text-text-dim font-mono"/>
                <button type="button" onClick={()=>browseFile(field)}
                  className="px-3 py-1.5 text-xs border border-border-base text-text-muted rounded-md hover:bg-bg-hover">Browse</button>
              </div>
            </div>
          ))}
          {/* SSL toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isX509||(form.ssl??false)} disabled={isX509} onChange={e=>f('ssl',e.target.checked)} className="w-4 h-4 accent-indigo-500"/>
            <span className="text-xs text-text-muted">Enable SSL/TLS</span>
          </label>
          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:bg-bg-hover">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-accent-database hover:bg-indigo-600 text-white rounded-md font-medium">
              {conn?'Save':'Add Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Schema Table Row ─────────────────────────────────────────────────────────
function SchemaRow({ table, isSelected, onSelect, onBrowse }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr className={cn('cursor-pointer', isSelected&&'selected')} onClick={()=>onSelect(table.name)} onDoubleClick={()=>onBrowse&&onBrowse(table.name)}>
        <td>
          <button onClick={e=>{e.stopPropagation();setExpanded(x=>!x)}} className="text-text-dim">
            {expanded?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
          </button>
        </td>
        <td className="font-mono text-sm font-medium text-text-primary">{table.name}</td>
        <td className="text-text-dim text-xs">{table.engine}</td>
        <td className="font-mono text-xs text-text-primary">{table.rows?.toLocaleString()}</td>
        <td className="text-text-dim text-xs">{table.columns}</td>
        <td className="text-text-dim text-xs">{table.size}</td>
        <td className="text-[10px] text-text-dim">{table.collation}</td>
        <td>
          <button onClick={e=>{e.stopPropagation();onBrowse&&onBrowse(table.name)}}
            className="text-[10px] px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors">
            Browse
          </button>
        </td>
      </tr>
      {expanded && table.columnDetails?.map(col=>(
        <tr key={col.name} className="bg-indigo-500/5">
          <td/>
          <td className="pl-6 font-mono text-xs text-text-muted">{col.name}</td>
          <td className="text-xs text-text-dim">{col.type}</td>
          <td>{col.key==='PRI'&&<span className="badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">PK</span>}
              {col.key==='UNI'&&<span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30">UNI</span>}</td>
          <td className="text-xs text-text-dim">{col.nullable?'null':''}</td>
          <td className="text-xs font-mono text-text-dim">{col.default}</td>
          <td/>
        </tr>
      ))}
    </>
  )
}

// ─── Chat with DB (Enhanced) ──────────────────────────────────────────────────
function ChatTab({ messages, input, onInputChange, onSend, isLoading, onRunSql, setQueryText }) {
  const SUGGESTIONS = [
    'How many rows in each table?',
    'Show 10 most recent records',
    'Tables with 1000+ rows',
    'Generate UPDATE for old records',
  ]
  const DML_KEYWORDS = ['UPDATE','DELETE','INSERT','DROP','ALTER','TRUNCATE','CREATE','REPLACE']

  const isDml = (sql) => {
    if (!sql) return false
    const first = sql.trim().split(/\s+/)[0].toUpperCase()
    return DML_KEYWORDS.includes(first)
  }

  const renderChatMessage = (msg) => {
    if (msg.role === 'user') return <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>

    // Assistant message — render SQL code blocks, DML warnings, inline results
    const parts = []

    // Show DML warning if SQL is a write operation
    if (msg.sql && isDml(msg.sql)) {
      parts.push(
        <div key="dml-warn" className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <AlertTriangle size={13} />
          <span className="font-semibold">⚠ DML Operation</span>
          <span className="text-text-dim ml-1">— This query modifies data. Review carefully before executing.</span>
        </div>
      )
    }

    // Render explanation text
    if (msg.content) {
      parts.push(<pre key="text" className="whitespace-pre-wrap font-sans text-text-muted leading-relaxed">{msg.content}</pre>)
    }

    // Render SQL code block with Run button
    if (msg.sql) {
      parts.push(
        <div key="sql" className="mt-2 rounded-lg border border-border-base overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-border-base">
            <span className="text-[10px] font-mono text-text-dim uppercase tracking-wider">SQL</span>
            <div className="flex items-center gap-1">
              <button onClick={() => navigator.clipboard.writeText(msg.sql)}
                className="text-[10px] px-2 py-0.5 rounded text-text-dim hover:text-text-muted border border-border-base/50 hover:bg-bg-hover">
                Copy
              </button>
              <button onClick={() => { if (setQueryText) setQueryText(msg.sql); toast.info('SQL sent to Query Runner') }}
                className="text-[10px] px-2 py-0.5 rounded text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10">
                → Query Runner
              </button>
              {onRunSql && (
                <button onClick={() => onRunSql(msg.sql)}
                  className="text-[10px] px-2 py-0.5 rounded text-green-400 hover:text-green-300 border border-green-500/30 hover:bg-green-500/10 flex items-center gap-1">
                  <Play size={9} />Run
                </button>
              )}
            </div>
          </div>
          <pre className="p-3 bg-black/20 overflow-x-auto">
            <code className="font-mono text-xs text-green-400 whitespace-pre">{msg.sql}</code>
          </pre>
        </div>
      )
    }

    // Render inline query result grid
    if (msg.queryResult && msg.queryResult.rows?.length > 0) {
      const { columns, rows } = msg.queryResult
      const colNames = columns.map(c => c.name ?? c)
      parts.push(
        <div key="result" className="mt-2 max-h-48 overflow-auto rounded-lg border border-border-base">
          <table className="data-table w-full">
            <thead className="sticky top-0 bg-bg-surface">
              <tr>
                <th className="w-8 text-center text-text-dim">#</th>
                {colNames.map(c => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i} className="hover:bg-bg-hover/30">
                  <td className="text-center text-text-dim text-[10px]">{i + 1}</td>
                  {Array.isArray(row)
                    ? row.map((cell, j) => (
                        <td key={j} className="font-mono text-xs max-w-[150px] truncate">
                          {cell == null ? <span className="text-text-dim italic">NULL</span> : String(cell)}
                        </td>
                      ))
                    : colNames.map(c => {
                        const v = row[c]
                        return (
                          <td key={c} className="font-mono text-xs max-w-[150px] truncate">
                            {v == null ? <span className="text-text-dim italic">NULL</span> : String(v)}
                          </td>
                        )
                      })
                  }
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && (
            <div className="px-3 py-1 text-[10px] text-text-dim bg-bg-surface/50 border-t border-border-base">
              Showing first 50 of {rows.length} rows
            </div>
          )}
        </div>
      )
    }

    return <>{parts}</>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {!messages.length ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-16">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <Bot size={32} className="text-accent-database"/>
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-text-primary">Chat with your Database</h3>
              <p className="text-xs text-text-muted mt-1">Ask in plain English. I'll generate & run the query for you.</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 max-w-sm">
              <Lock size={12}/>AI only executes read-only queries. Write operations are shown for review.
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-sm w-full mt-2">
              {SUGGESTIONS.map(s=>(
                <button key={s} onClick={()=>{onInputChange(s);onSend(s)}}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border-base bg-bg-primary hover:border-accent-database hover:bg-indigo-500/5 text-text-muted transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(msg=>(
              <div key={msg.id} className={cn('flex gap-3', msg.role==='user'&&'justify-end')}>
                {msg.role==='assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot size={14} className="text-indigo-400"/>
                  </div>
                )}
                <div className={cn('max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed',
                  msg.role==='user'
                    ? 'bg-indigo-500/20 text-text-primary border border-indigo-500/30'
                    : 'bg-bg-primary border border-border-base text-text-muted'
                )}>
                  {renderChatMessage(msg)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Bot size={14} className="text-indigo-400"/>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border-base bg-bg-primary">
                  <LoadingSpinner size={13} color="#6366f1"/><span className="text-xs text-text-muted">Thinking…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-border-base p-3 flex gap-2 flex-shrink-0">
        <input value={input} onChange={e=>onInputChange(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend(input)}}}
          placeholder="Ask anything about your database…"
          className="flex-1 bg-bg-primary border border-border-base rounded-lg px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
        <button onClick={()=>onSend(input)} disabled={!input.trim()||isLoading}
          className="px-3 py-2 bg-accent-database hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50">
          <Send size={14}/>
        </button>
      </div>
      <div className="px-4 pb-2 text-[10px] text-text-dim text-center">Press Enter to send · Shift+Enter for new line</div>
    </div>
  )
}

// ─── Query Runner (Enhanced) ──────────────────────────────────────────────────
function QueryTab({ queryText, queryResult, isRunning, onTextChange, onRun, onClear, onAiGenerate, connId }) {
  const [typeBadge, setTypeBadge] = useState({ label:'SELECT', safe:true })
  const DML_TYPES = ['UPDATE','DELETE','INSERT','DROP','ALTER','TRUNCATE','CREATE','REPLACE']

  const checkType = (sql) => {
    const first = (sql||'').trim().split(/\s+/)[0].toUpperCase()
    setTypeBadge(DML_TYPES.includes(first) ? { label:`⚠ ${first}`, safe:false } : { label: first||'SELECT', safe:true })
  }

  const isDmlResult = queryResult && !typeBadge.safe && (queryResult.rows?.length ?? 0) === 0

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">SQL Editor</span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded font-mono font-semibold', typeBadge.safe ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>
            {typeBadge.label}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={onClear} className="text-xs px-2 py-1 border border-border-base text-text-dim rounded hover:bg-bg-hover">🗑 Clear</button>
          {onAiGenerate && <button onClick={()=>onAiGenerate(connId)} className="text-xs px-2 py-1 border border-border-base text-text-dim rounded hover:bg-bg-hover">🤖 AI Generate</button>}
        </div>
      </div>
      <textarea value={queryText} onChange={e=>{onTextChange(e.target.value);checkType(e.target.value)}}
        className="w-full h-32 bg-bg-primary border border-border-base rounded-lg p-3 font-mono text-sm text-text-primary focus:border-border-focus outline-none resize-none placeholder:text-text-dim"
        placeholder={"-- Write your SQL here\nSELECT * FROM users LIMIT 10"}/>
      <div className="flex justify-end">
        <button onClick={()=>onRun(queryText)} disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-accent-database hover:bg-indigo-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60">
          {isRunning?<><LoadingSpinner size={13} color="white"/>Running…</>:'▶ Run Query'}
        </button>
      </div>

      {/* DML Summary Card */}
      {isDmlResult && queryResult && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <Check size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-400">
              {queryResult.affectedRows != null
                ? `${queryResult.affectedRows} row${queryResult.affectedRows !== 1 ? 's' : ''} affected`
                : `Query executed successfully`}
            </p>
            <p className="text-xs text-text-dim mt-0.5">
              Completed in {queryResult.time}ms
            </p>
          </div>
        </div>
      )}

      {/* SELECT-style result grid */}
      {queryResult && !isDmlResult && (
        <div className="flex-1 overflow-auto border border-border-base rounded-lg">
          <div className="px-3 py-1.5 border-b border-border-base text-[10px] text-text-dim bg-bg-surface/50">
            {queryResult.rowCount} row{queryResult.rowCount!==1?'s':''} · {queryResult.time}ms
            {queryResult.affectedRows!=null && <> · {queryResult.affectedRows} affected</>}
          </div>
          <table className="data-table">
            <thead><tr>{queryResult.columns.map(c=><th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {queryResult.rows.map((row,i)=>(
                <tr key={i}>{queryResult.columns.map(c=><td key={c} className="font-mono text-xs">{row[c]==null?<span className="text-text-dim italic">NULL</span>:String(row[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Data Browser Modal ────────────────────────────────────────────────────────
function DataBrowserModal({ connId, tableName, onClose }) {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [filter, setFilter]     = useState('')
  const [filterInput, setFilterInput] = useState('')
  const [data, setData]         = useState(null) // { columns, rows, total, totalPages }
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const load = async (p=page, ps=pageSize, f=filter) => {
    setLoading(true); setError(null)
    try {
      const res = await window.api.db.browseTable({ connId, tableName, page: p, pageSize: ps, filter: f })
      if (res?.ok) setData(res)
      else setError(res?.error ?? 'Failed to load data')
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load(1, pageSize, '') }, [connId, tableName])

  const goPage = (p) => {
    const clamped = Math.max(1, Math.min(p, data?.totalPages??1))
    setPage(clamped); load(clamped, pageSize, filter)
  }
  const applyFilter = () => { setFilter(filterInput); setPage(1); load(1, pageSize, filterInput) }
  const clearFilter = () => { setFilter(''); setFilterInput(''); setPage(1); load(1, pageSize, '') }
  const changePageSize = (ps) => { setPageSize(ps); setPage(1); load(1, ps, filter) }

  const startRow = (page-1)*pageSize+1
  const endRow   = Math.min(page*pageSize, data?.total??0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-bg-surface border border-border-base rounded-xl shadow-2xl flex flex-col" style={{width:'100vw',height:'100vh',maxWidth:'100vw',maxHeight:'100vh',borderRadius:0}}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-base flex-shrink-0">
          <span className="font-semibold text-sm text-text-primary font-mono">{tableName}</span>
          {data && <span className="text-xs text-text-dim">({data.total?.toLocaleString()} rows)</span>}
          {/* Filter */}
          <div className="flex items-center gap-1 ml-4 flex-1 max-w-md">
            <input value={filterInput} onChange={e=>setFilterInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&applyFilter()}
              placeholder="Filter (WHERE clause or JSON for Mongo)…"
              className="flex-1 bg-bg-primary border border-border-base rounded-md px-2.5 py-1 text-xs text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
            <button onClick={applyFilter} className="px-2 py-1 text-xs border border-border-base text-text-muted rounded hover:bg-bg-hover">Apply</button>
            {filter && <button onClick={clearFilter} className="px-2 py-1 text-xs border border-border-base text-red-400 rounded hover:bg-bg-hover">Clear</button>}
          </div>
          <button onClick={onClose} className="ml-auto text-text-dim hover:text-text-primary"><X size={16}/></button>
        </div>
        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading && <div className="flex items-center justify-center h-full text-text-dim">Loading…</div>}
          {error   && <div className="flex items-center justify-center h-full text-red-400">❌ {error}</div>}
          {data && !loading && (
            <table className="data-table w-full">
              <thead className="sticky top-0 z-10 bg-bg-surface">
                <tr>
                  <th className="w-10 text-center text-text-dim">#</th>
                  {data.columns.map(c=><th key={c.name??c}>{c.name??c}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr><td colSpan={data.columns.length+1} className="text-center py-8 text-text-dim italic">No rows found.</td></tr>
                )}
                {data.rows.map((row,i)=>(
                  <tr key={i} className="hover:bg-bg-hover/30">
                    <td className="text-center text-text-dim text-[10px]">{startRow+i}</td>
                    {Array.isArray(row)
                      ? row.map((cell,j)=>(
                          <td key={j} className="font-mono text-xs max-w-[200px] truncate" title={cell==null?'NULL':String(cell)}>
                            {cell==null ? <span className="text-text-dim italic">NULL</span> : String(cell).length>200 ? String(cell).substring(0,200)+'…' : String(cell)}
                          </td>
                        ))
                      : data.columns.map(c=>{const k=c.name??c;const v=row[k];return(
                          <td key={k} className="font-mono text-xs max-w-[200px] truncate" title={v==null?'NULL':String(v)}>
                            {v==null ? <span className="text-text-dim italic">NULL</span> : String(v).length>200 ? String(v).substring(0,200)+'…' : String(v)}
                          </td>
                        )})
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Pagination Footer */}
        {data && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border-base flex-shrink-0 bg-bg-surface/60">
            <span className="text-xs text-text-dim">Showing {startRow.toLocaleString()}–{endRow.toLocaleString()} of {data.total.toLocaleString()} rows</span>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>goPage(1)} className="px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover">⏮</button>
              <button disabled={page<=1} onClick={()=>goPage(page-1)} className="px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover">◀</button>
              <input type="number" value={page} min={1} max={data.totalPages}
                onChange={e=>goPage(parseInt(e.target.value)||1)}
                className="w-12 text-center bg-bg-primary border border-border-base rounded text-xs text-text-primary outline-none py-1"/>
              <span className="text-xs text-text-dim">/ {data.totalPages}</span>
              <button disabled={page>=data.totalPages} onClick={()=>goPage(page+1)} className="px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover">▶</button>
              <button disabled={page>=data.totalPages} onClick={()=>goPage(data.totalPages)} className="px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover">⏭</button>
              <select value={pageSize} onChange={e=>changePageSize(+e.target.value)}
                className="bg-bg-primary border border-border-base rounded text-xs text-text-primary outline-none py-1 px-1.5">
                {[25,50,100,200].map(n=><option key={n} value={n}>{n}/page</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CLI Tools Settings Panel ──────────────────────────────────────────────────
function CliToolsPanel({ connType }) {
  const [cliPaths, setCliPaths] = useState(null)
  const [loading, setLoading] = useState(true)

  const TOOL_MAP = {
    mysql:    { name: 'mysqldump', icon: '🐬' },
    postgres: { name: 'pg_dump',   icon: '🐘' },
    mongodb:  { name: 'mongodump', icon: '🍃' },
    redis:    { name: 'redis-cli', icon: '🔴' },
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await window.api.db.getCliPaths()
        setCliPaths(res ?? {})
      } catch (_) { setCliPaths({}) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const browseTool = async (toolName) => {
    try {
      const res = await window.api.db.browseCliPath({ tool: toolName })
      if (res?.path) {
        const updated = { ...cliPaths, [toolName]: res.path }
        setCliPaths(updated)
        await window.api.db.saveCliPaths(updated)
        toast.success(`${toolName} path saved`)
      }
    } catch (_) {}
  }

  const clearTool = async (toolName) => {
    const updated = { ...cliPaths }
    delete updated[toolName]
    setCliPaths(updated)
    await window.api.db.saveCliPaths(updated)
    toast.info(`${toolName} path cleared — using auto-detection`)
  }

  if (loading) return <div className="py-4 text-center"><LoadingSpinner size={14} /></div>

  const tool = TOOL_MAP[connType]
  if (!tool) return <p className="text-xs text-text-dim py-2">No CLI tool for this database type.</p>

  const hasCustom = cliPaths?.[tool.name]

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-2">CLI Tools</p>
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border-base bg-bg-primary">
        <span className="text-base">{tool.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-text-primary">{tool.name}</p>
          <p className="text-[10px] text-text-dim truncate">
            {hasCustom ? cliPaths[tool.name] : 'Auto-detect (system PATH)'}
          </p>
        </div>
        <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono',
          hasCustom ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'
        )}>
          {hasCustom ? 'CUSTOM' : 'AUTO'}
        </span>
        <button onClick={() => browseTool(tool.name)}
          className="text-[10px] px-2 py-0.5 rounded border border-border-base text-text-muted hover:bg-bg-hover">
          Browse
        </button>
        {hasCustom && (
          <button onClick={() => clearTool(tool.name)}
            className="text-[10px] text-text-dim hover:text-red-400">✕</button>
        )}
      </div>
    </div>
  )
}

// ─── Main Database Page ────────────────────────────────────────────────────────
export default function DatabasePage() {
  const {
    connections, selectedConnId, schema, selectedTable, lastDiagnostics,
    activeTab, chatMessages, chatInput, isChatLoading, queryText, queryResult, isRunningQuery,
    isAiAnalyzing, aiAnalysisResult, isRunningDiagnostics, backupDir, isRunningBackup, backupLog,
    loadConnections, selectConnection, selectTable, setActiveTab,
    testConnection, fetchSchema, runDiagnostics, runAiAnalysis,
    sendChatMessage, setChatInput, setQueryText, runQuery,
    saveConnection, deleteConnection, runBackup, setBackupDir,
  } = useDatabaseStore()

  const [connModal, setConnModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [connFilter, setConnFilter] = useState('')
  const [dataBrowser, setDataBrowser] = useState(null) // { tableName }
  const [aiCopied, setAiCopied] = useState(false)
  const [showCliTools, setShowCliTools] = useState(false)
  const rightPanel = useResizablePanel({ initial: 280, min: 200, max: 500, direction: 'horizontal', side: 'end' })

  const copyAiResult = () => {
    if (aiAnalysisResult?.analysis) {
      navigator.clipboard.writeText(aiAnalysisResult.analysis)
      setAiCopied(true)
      setTimeout(()=>setAiCopied(false), 1500)
    }
  }

  const handleAiGenerate = async (connId) => {
    const prompt = window.prompt('Describe the query you want AI to generate:\n\nExample: "Show all orders from last 7 days"')
    if (!prompt?.trim()) return
    setQueryText('-- Generating with AI…')
    try {
      const res = await window.api.db.chatQuery({ connId, question: prompt, schema: JSON.stringify(schema?._raw||{}), generateOnly: true })
      if (res?.ok && res.sql) {
        setQueryText(res.sql)
        toast.success('AI query generated!')
      } else toast.error(res?.error ?? 'AI failed to generate query')
    } catch(e) { toast.error(e.message) }
  }

  // Run SQL from chat inline
  const handleRunSqlFromChat = useCallback(async (sql) => {
    if (!selectedConnId || !sql) return
    try {
      const t0 = Date.now()
      const res = await window.api.db.runQuery({ connId: selectedConnId, sql })
      const elapsed = Date.now() - t0
      if (res?.ok) {
        const columns = (res.columns ?? []).map(c => c.name ?? c)
        const rawRows = res.rows ?? []
        const rows = rawRows.map(row => Array.isArray(row) ? Object.fromEntries(columns.map((c, i) => [c, row[i]])) : row)
        toast.success(`Query returned ${rows.length} rows in ${elapsed}ms`)
      } else {
        toast.error(res?.error ?? 'Query failed')
      }
    } catch (err) { toast.error(err.message) }
  }, [selectedConnId])

  const selectedConn = connections.find(c=>c.id===selectedConnId)
  const filteredConns = connFilter ? connections.filter(c=>c.name.toLowerCase().includes(connFilter.toLowerCase())) : connections

  useEffect(()=>{ loadConnections() },[])

  const TABS = [
    {id:'schema', label:'Schema'},
    {id:'chat',   label:'Chat with DB'},
    {id:'query',  label:'Query Runner'},
    {id:'backup', label:'💾 Backup'},
  ]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Connection list */}
      <div className="flex flex-col bg-bg-surface border-r border-border-base overflow-hidden" style={{width:250,minWidth:200}}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-base flex-shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Connections</span>
          <button onClick={()=>setConnModal({mode:'add'})} className="text-accent-database text-xs flex items-center gap-1"><Plus size={12}/>Add</button>
        </div>
        <div className="px-3 py-2 border-b border-border-base flex-shrink-0">
          <input value={connFilter} onChange={e=>setConnFilter(e.target.value)} placeholder="Filter…"
            className="w-full bg-bg-primary border border-border-base rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filteredConns.map(conn=>{
            const dtype = DB_TYPES[conn.type]
            const isSel = conn.id===selectedConnId
            const isConnected = conn.status === 'connected' || conn.status === 'online'
            const isError = conn.status === 'error'
            return (
              <div key={conn.id}
                className={cn('relative flex flex-col px-3 py-2 cursor-pointer group transition-all',
                  isSel ? 'bg-indigo-500/10 border-l-2 border-accent-database' : 'hover:bg-bg-hover/60 border-l-2 border-transparent'
                )}
                onClick={()=>selectConnection(conn.id)}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <span className="text-base leading-none">{dtype?.icon}</span>
                    <span className={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg-surface',
                      isConnected ? 'bg-green-400' : isError ? 'bg-red-400' : 'bg-slate-500'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium truncate', isSel ? 'text-text-primary' : 'text-text-muted')}>{conn.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono text-text-dim truncate">{conn.uri ? 'URI' : `${conn.host}:${conn.port}`}</span>
                      <span className="text-[8px] px-1 py-px rounded font-medium" style={{ background: dtype?.bg, color: dtype?.color }}>{dtype?.label}</span>
                    </div>
                  </div>
                </div>
                {/* Edit / Delete actions — shown on hover */}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-bg-surface border border-border-base rounded-md shadow-sm">
                  <button onClick={e=>{e.stopPropagation();setConnModal({mode:'edit',conn})}}
                    className="p-1.5 text-text-dim hover:text-accent-database rounded-l-md hover:bg-bg-hover transition-colors" title="Edit">
                    <Pencil size={11}/>
                  </button>
                  <button onClick={e=>{e.stopPropagation();setConfirmDelete(conn.id)}}
                    className="p-1.5 text-text-dim hover:text-red-400 rounded-r-md hover:bg-bg-hover transition-colors" title="Delete">
                    <Trash2 size={11}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="resize-divider"/>

      {/* Center: Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConn && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-base bg-bg-surface/60 flex-shrink-0">
            <span className="text-lg">{DB_TYPES[selectedConn.type]?.icon}</span>
            <div>
              <span className="font-semibold text-text-primary text-sm">{selectedConn.name}</span>
              <span className="font-mono text-xs text-text-dim ml-2">{selectedConn.host}:{selectedConn.port}</span>
            </div>
            <TypeBadge label={DB_TYPES[selectedConn.type]?.label} color={DB_TYPES[selectedConn.type]?.color} bg={DB_TYPES[selectedConn.type]?.bg}/>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={async ()=>{
                const res = await testConnection(selectedConnId)
                if (res?.ok) toast.success(`OK — ${res.version}`)
                else toast.error(res?.error ?? 'Test failed')
              }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                <TestTube size={12}/>Test
              </button>
              <button onClick={()=>runDiagnostics(selectedConnId)} disabled={isRunningDiagnostics}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50">
                {isRunningDiagnostics ? <><LoadingSpinner size={12} color="#6366f1"/>Running…</> : <><RefreshCw size={12}/>Diagnostics</>}
              </button>
              <button onClick={()=>runAiAnalysis(selectedConnId)} disabled={isAiAnalyzing}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50">
                {isAiAnalyzing ? <><LoadingSpinner size={12} color="#6366f1"/>Analyzing…</> : <><Bot size={12}/>AI Analyze</>}
              </button>
            </div>
          </div>
        )}
        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border-base bg-bg-surface/40 flex-shrink-0">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors', activeTab===t.id?'bg-accent-database/20 text-accent-database':'text-text-muted hover:text-text-primary hover:bg-bg-hover')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={cn('flex-1 overflow-hidden', activeTab!=='chat'&&'overflow-y-auto')}>
          {activeTab==='schema' && schema && (
            <div>
              <div className="px-4 py-2 border-b border-border-base bg-bg-surface/30 flex items-center gap-2">
                <span className="text-xs text-text-dim">{schema.summary?.tables} tables · {schema.summary?.totalRows?.toLocaleString()} total rows · {schema.summary?.totalSize}</span>
              </div>
              <table className="data-table">
                <thead className="sticky top-0 bg-bg-surface z-10">
                  <tr>
                    <th className="w-8"/>
                    <th>Table Name</th><th>Engine</th><th>Rows</th><th>Columns</th><th>Size</th><th>Collation</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {schema.items?.map(t=>(
                    <SchemaRow key={t.name} table={t} isSelected={selectedTable===t.name} onSelect={selectTable}
                      onBrowse={(name)=>setDataBrowser({tableName:name})}/>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab==='chat' && (
            <ChatTab messages={chatMessages} input={chatInput} isLoading={isChatLoading}
              onInputChange={setChatInput} onSend={msg=>{if(msg.trim())sendChatMessage(msg)}}
              onRunSql={handleRunSqlFromChat} setQueryText={setQueryText}/>
          )}
          {activeTab==='query' && (
            <QueryTab queryText={queryText} queryResult={queryResult} isRunning={isRunningQuery}
              onTextChange={setQueryText} onRun={runQuery}
              onClear={()=>{setQueryText('');}} connId={selectedConnId} onAiGenerate={handleAiGenerate}/>
          )}
          {activeTab==='backup' && selectedConn && (
            <div className="p-4 max-w-xl">
              <BackupPanel connId={selectedConnId} onRunBackup={runBackup} />
              <div className="mt-6">
                <button onClick={() => setShowCliTools(v => !v)}
                  className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors">
                  <Settings size={12} />
                  {showCliTools ? 'Hide' : 'Show'} CLI Tools Settings
                </button>
                {showCliTools && (
                  <div className="mt-3">
                    <CliToolsPanel connType={selectedConn.type} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div {...rightPanel.dividerProps} />

      {/* Right: Details */}
      <div className="flex flex-col bg-bg-surface border-l border-border-base overflow-y-auto flex-shrink-0"
        style={{ width: rightPanel.size }}>
        <div className="p-4 space-y-4">
          {/* Table Details — only when a table is selected */}
          {selectedTable && schema?.items?.find(t=>t.name===selectedTable) ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-2">Table Details</p>
              {Object.entries(schema.items.find(t=>t.name===selectedTable)||{}).filter(([k])=>!['columnDetails','name'].includes(k)).map(([k,v])=>(
                <div key={k} className="flex justify-between py-1">
                  <span className="text-xs text-text-muted capitalize">{k}</span>
                  <span className="text-xs font-mono text-text-primary">{typeof v==='number'?v.toLocaleString():v}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Database} title="Select a table" message="Click a table row to see details and indexes."/>
          )}

          {/* Diagnostics — always visible when data is available */}
          {lastDiagnostics?.checks && (
            <div className="border-t border-border-base pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-2">Diagnostics</p>
              {lastDiagnostics.version && (
                <div className="flex justify-between py-1">
                  <span className="text-xs text-text-muted">Version</span>
                  <span className="text-xs font-mono text-text-primary">{lastDiagnostics.version}</span>
                </div>
              )}
              {lastDiagnostics.checks.map(c=>(
                <div key={c.id} className="py-1.5 border-b border-border-base/20">
                  <div className="flex items-center gap-1.5">
                    <span className="flex-shrink-0">{c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : c.status === 'fail' ? '❌' : 'ℹ️'}</span>
                    <span className="text-xs text-text-muted font-medium">{c.label}</span>
                  </div>
                  {c.detail && (
                    <p className="text-[10px] font-mono text-text-primary mt-0.5 pl-5 break-words whitespace-pre-wrap leading-relaxed">{c.detail}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Analysis — always visible when data is available */}
          {aiAnalysisResult && (
            <div className="border-t border-border-base pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">AI Analysis</p>
                <button onClick={copyAiResult}
                  className="text-[10px] px-2 py-0.5 rounded border border-border-base text-text-muted hover:bg-bg-hover flex items-center gap-1">
                  {aiCopied ? <><Check size={10}/>Copied!</> : <><Copy size={10}/>Copy</>}
                </button>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <MarkdownRenderer content={aiAnalysisResult.analysis ?? ''} />
                {aiAnalysisResult.provider && (
                  <p className="mt-2 text-[10px] text-text-dim">via {aiAnalysisResult.provider} · {aiAnalysisResult.model}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {connModal && (
        <ConnectionFormModal conn={connModal.conn} onSave={c=>{saveConnection(c);toast.success('Connection saved')}} onClose={()=>setConnModal(null)}/>
      )}
      {dataBrowser && selectedConnId && (
        <DataBrowserModal connId={selectedConnId} tableName={dataBrowser.tableName} onClose={()=>setDataBrowser(null)}/>
      )}
      <ConfirmDialog isOpen={!!confirmDelete} title="Delete Connection" message="Are you sure?" confirmLabel="Delete"
        onConfirm={()=>{deleteConnection(confirmDelete);toast.success('Deleted');setConfirmDelete(null)}}
        onCancel={()=>setConfirmDelete(null)}/>
    </div>
  )
}
