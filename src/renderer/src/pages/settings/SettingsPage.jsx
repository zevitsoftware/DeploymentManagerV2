import { useState, useEffect } from 'react'
import useAuthStore from '../../stores/useAuthStore'
import { toast } from '../../stores/useAppStore'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { AI_MODES, AI_MODELS } from '../../lib/constants'
import {
  User, Bot, Key, ChevronDown, ChevronRight, CheckCircle2,
  AlertCircle, Plus, Trash2, Eye, EyeOff, TestTube, Github, Droplet
} from 'lucide-react'
import { cn } from '../../lib/utils'

function SectionHeader({ icon: Icon, label, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-0 py-3 border-b border-border-base group"
    >
      <div className="w-7 h-7 rounded-lg bg-bg-hover flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-text-muted"/>
      </div>
      <span className="flex-1 text-sm font-semibold text-text-primary text-left">{label}</span>
      {open ? <ChevronDown size={15} className="text-text-dim"/> : <ChevronRight size={15} className="text-text-dim"/>}
    </button>
  )
}

function GcpAuthSection({ user, onLogin, onLogout, isLoading }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <SectionHeader icon={User} label="GCP Authentication" open={open} onToggle={()=>setOpen(o=>!o)}/>
      {open && (
        <div className="py-4 space-y-3">
          {user ? (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
              <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5"/>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Authenticated</p>
                <p className="text-xs text-text-muted mt-0.5">{user.email}</p>
                <p className="text-xs font-mono text-text-dim mt-0.5">{user.account}</p>
              </div>
              <button onClick={onLogout}
                className="text-xs px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-border-base bg-bg-primary text-center space-y-3">
              <AlertCircle size={32} className="text-text-dim mx-auto"/>
              <p className="text-sm text-text-muted">Not authenticated. Sign in with Google Cloud to manage GCP firewalls.</p>
              <button onClick={onLogin} disabled={isLoading}
                className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-60">
                {isLoading?<><LoadingSpinner size={13} color="white"/>Authenticating…</>:'Sign in with Google'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ApiKeyInput({ value, label, placeholder, onChange, onDelete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center gap-0 bg-bg-primary border border-border-base rounded-md overflow-hidden">
        <input type={show?'text':'password'} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
          className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-text-primary focus:outline-none placeholder:text-text-dim"/>
        <button onClick={()=>setShow(s=>!s)} className="px-2 text-text-dim hover:text-text-muted transition-colors">
          {show?<EyeOff size={13}/>:<Eye size={13}/>}
        </button>
      </div>
      <button onClick={onDelete} className="p-2 text-text-dim hover:text-red-400 transition-colors rounded">
        <Trash2 size={13}/>
      </button>
    </div>
  )
}

function AiConfigSection({ aiConfig, onSave, onTest }) {
  const [open, setOpen] = useState(true)
  const [form, setForm] = useState(aiConfig)
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    setIsTesting(true)
    try {
      // Auto-save current form values so the test uses the selected model
      await onSave(form)
      const res = await onTest()
      if (res?.ok) toast.success(`AI OK — ${res.provider ?? ''}: ${(res.analysis ?? '').slice(0,80)}`)
      else toast.error(`AI test failed: ${res?.error ?? 'Unknown error'}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div>
      <SectionHeader icon={Bot} label="AI Configuration" open={open} onToggle={()=>setOpen(o=>!o)}/>
      {open && (
        <div className="py-4 space-y-4">
          {/* Mode toggle */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-2">AI Provider Mode</label>
            <div className="flex gap-2">
              {[{id:AI_MODES.GEMINI_CLI,label:'Gemini CLI (Recommended)'},{id:AI_MODES.API_KEYS,label:'API Keys'}].map(opt=>(
                <button key={opt.id} onClick={()=>setForm(f=>({...f,mode:opt.id}))}
                  className={cn('flex-1 py-2 text-xs font-medium rounded-lg border transition-colors', form.mode===opt.id?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'border-border-base text-text-muted hover:bg-bg-hover')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gemini CLI */}
          {form.mode===AI_MODES.GEMINI_CLI && (
            <div className="space-y-3">
              <div className={cn('flex items-center gap-3 p-3 rounded-lg border',
                form.cliReady?'bg-green-500/10 border-green-500/30':'bg-yellow-500/10 border-yellow-500/30')}>
                {form.cliReady?<CheckCircle2 size={16} className="text-green-400"/>:<AlertCircle size={16} className="text-yellow-400"/>}
                <div>
                  <p className="text-xs font-medium text-text-primary">{form.cliReady?'Gemini CLI ready':'Gemini CLI not detected'}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{form.cliReady?'Using CloudCode API via `gemini` CLI':'Install: npm install -g @google/gemini-cli'}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Model</label>
                <select value={form.model} onChange={e=>setForm(f=>({...f,model:e.target.value}))}
                  className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none">
                  {AI_MODELS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* API Keys */}
          {form.mode===AI_MODES.API_KEYS && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-text-muted">Groq API Keys</label>
                  <button onClick={()=>setForm(f=>({...f,groqKeys:[...f.groqKeys,'']}))}>
                    <Plus size={13} className="text-text-dim hover:text-text-muted"/>
                  </button>
                </div>
                {form.groqKeys.map((k,i)=>(
                  <ApiKeyInput key={i} value={k} label={`Groq #${i+1}`} placeholder="gsk_…"
                    onChange={v=>setForm(f=>({...f,groqKeys:f.groqKeys.map((x,j)=>j===i?v:x)}))}
                    onDelete={()=>setForm(f=>({...f,groqKeys:f.groqKeys.filter((_,j)=>j!==i)}))}/>
                ))}
                {!form.groqKeys.length && <p className="text-xs text-text-dim">No Groq keys added. Click + to add.</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-text-muted">Gemini API Keys</label>
                  <button onClick={()=>setForm(f=>({...f,geminiKeys:[...f.geminiKeys,'']}))}>
                    <Plus size={13} className="text-text-dim hover:text-text-muted"/>
                  </button>
                </div>
                {form.geminiKeys.map((k,i)=>(
                  <ApiKeyInput key={i} value={k} label={`Gemini #${i+1}`} placeholder="AIza…"
                    onChange={v=>setForm(f=>({...f,geminiKeys:f.geminiKeys.map((x,j)=>j===i?v:x)}))}
                    onDelete={()=>setForm(f=>({...f,geminiKeys:f.geminiKeys.filter((_,j)=>j!==i)}))}/>
                ))}
                {!form.geminiKeys.length && <p className="text-xs text-text-dim">No Gemini keys added. Click + to add.</p>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleTest} disabled={isTesting}
              className="flex items-center gap-2 px-3 py-2 text-xs border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-60">
              {isTesting?<><LoadingSpinner size={12} color="#94a3b8"/>Testing…</>:<><TestTube size={13}/>Test Connection</>}
            </button>
            <button onClick={()=>onSave(form)}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors">
              Save Config
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GitConfigSection() {
  const [open, setOpen] = useState(true)
  const [form, setForm] = useState({ username: '', token: '' })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    window.api.deploy.getGitConfig().then(res => {
      if (res) setForm(res)
    })
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const payload = {
        username: form.username.trim(),
        token: form.token.trim()
      }
      const res = await window.api.deploy.saveGitConfig(payload)
      if (res.ok) toast.success('Git config saved')
      else toast.error(res?.error ?? 'Failed to save git config')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <SectionHeader icon={Github} label="Git Configuration" open={open} onToggle={()=>setOpen(o=>!o)}/>
      {open && (
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Git Username</label>
            <input type="text" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}
              placeholder="e.g. johndoe"
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Personal Access Token (PAT)</label>
            <ApiKeyInput value={form.token} label="Git Token" placeholder="ghp_..."
               onChange={v=>setForm(f=>({...f,token:v}))}
               onDelete={()=>setForm(f=>({...f,token:''}))} />
            <p className="text-[10px] text-text-dim mt-1.5">Used for reading remote branches and committing during deployment.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors">
              Save Config
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DoConfigSection() {
  const [open, setOpen] = useState(true)
  const [form, setForm] = useState({ token: '' })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    window.api.deploy.getDoConfig().then(res => {
      if (res) setForm(res)
    })
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const payload = {
        token: form.token.trim()
      }
      const res = await window.api.deploy.saveDoConfig(payload)
      if (res.ok) toast.success('DigitalOcean config saved')
      else toast.error(res?.error ?? 'Failed to save DO config')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <SectionHeader icon={Droplet} label="DigitalOcean Configuration" open={open} onToggle={() => setOpen(o => !o)} />
      {open && (
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Personal Access Token (API Key)</label>
            <ApiKeyInput value={form.token} label="DO Token" placeholder="dop_v1_..."
               onChange={v => setForm({ token: v })}
               onDelete={() => setForm({ token: '' })} />
            <p className="text-[10px] text-text-dim mt-1.5">Used for authenticating when managing firewalls on DigitalOcean.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors">
              Save Config
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


export default function SettingsPage() {
  const { user, isLoading, aiConfig, login, logout, saveAiConfig, testAi } = useAuthStore()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-2">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-0.5">Manage authentication, AI configuration, and application preferences.</p>
        </div>

        <div className="bg-bg-surface border border-border-base rounded-xl p-6 space-y-0 divide-y divide-border-base/50">
          <GcpAuthSection user={user} onLogin={login} onLogout={logout} isLoading={isLoading}/>
          <div className="pt-2">
            <AiConfigSection aiConfig={aiConfig} onSave={saveAiConfig} onTest={testAi}/>
          </div>
          <div className="pt-2">
            <GitConfigSection />
          </div>
          <div className="pt-2">
            <DoConfigSection />
          </div>
        </div>

        {/* App info */}
        <div className="bg-bg-surface border border-border-base rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Zevitsoft Deployment Manager</p>
            <p className="text-xs text-text-muted mt-0.5">v2.0.0-alpha · Electron · Vite · React</p>
          </div>
          <div className="text-xs text-text-dim font-mono px-3 py-1.5 bg-bg-primary border border-border-base rounded-lg">
            Build: 2026.03.13
          </div>
        </div>
      </div>
    </div>
  )
}
