// ─── Page IDs ─────────────────────────────────────────────────────────────
export const PAGES = {
  FIREWALL:   'firewall',
  DEPLOY:     'deploy',
  DATABASE:   'database',
  CLOUDFLARE: 'cloudflare',
  SETTINGS:   'settings',
}

// ─── DB Types ──────────────────────────────────────────────────────────────
export const DB_TYPES = {
  mysql:    { label: 'MySQL',      color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   icon: '🐬', defaultPort: 3306  },
  postgres: { label: 'PostgreSQL', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: '🐘', defaultPort: 5432  },
  mongodb:  { label: 'MongoDB',    color: '#14b8a6', bg: 'rgba(20,184,166,0.15)', icon: '🍃', defaultPort: 27017 },
  redis:    { label: 'Redis',      color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  icon: '⚡', defaultPort: 6379  },
}

// ─── Firewall Provider Types ───────────────────────────────────────────────
export const FW_PROVIDERS = {
  gcp:      { label: 'GCP',       color: '#4285f4', bg: 'rgba(66,133,244,0.15)'  },
  gcpsql:   { label: 'Cloud SQL', color: '#a855f7', bg: 'rgba(168,85,247,0.15)'  },
  do:       { label: 'DO',        color: '#0080ff', bg: 'rgba(0,128,255,0.15)'   },
  atlas:    { label: 'Atlas',     color: '#00ed64', bg: 'rgba(0,237,100,0.15)'   },
}

// ─── DNS Record Types ──────────────────────────────────────────────────────
export const DNS_TYPES = {
  A:     { color: '#f6821f', bg: 'rgba(246,130,31,0.15)' },
  AAAA:  { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  CNAME: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)'  },
  MX:    { color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  TXT:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)'},
  NS:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
}

// ─── Deploy Pipeline Steps ─────────────────────────────────────────────────
export const DEPLOY_STEPS_PM2 = [
  { id: 'validate',     label: 'Validate Config'      },
  { id: 'git_pull',     label: 'Git Pull'              },
  { id: 'npm_install',  label: 'Install Dependencies'  },
  { id: 'npm_build',    label: 'Build Project'         },
  { id: 'pm2_restart',  label: 'Restart PM2'           },
  { id: 'health_check', label: 'Health Check'          },
  { id: 'complete',     label: 'Complete'              },
]

export const DEPLOY_STEPS_STATIC = [
  { id: 'validate',     label: 'Validate Config'      },
  { id: 'npm_build',    label: 'Build Locally'         },
  { id: 'upload',       label: 'Upload to Server'      },
  { id: 'complete',     label: 'Complete'              },
]

// ─── Sidebar Nav Items ─────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id: PAGES.FIREWALL,   label: 'Firewall',   accent: '#f6465d' },
  { id: PAGES.DEPLOY,     label: 'Deploy',     accent: '#0ecb81' },
  { id: PAGES.DATABASE,   label: 'Database',   accent: '#f0b90b' },
  { id: PAGES.CLOUDFLARE, label: 'Cloudflare', accent: '#f6821f' },
]

// ─── Server Connection Status ──────────────────────────────────────────────
export const SERVER_STATUS = {
  ONLINE:  'online',
  OFFLINE: 'offline',
  ERROR:   'error',
  PENDING: 'pending',
}

// ─── AI Modes ──────────────────────────────────────────────────────────────
export const AI_MODES = {
  GEMINI_CLI: 'gemini-cli',
  API_KEYS:   'api-key',
}

// ─── AI CLI Models ────────────────────────────────────────────────────────
export const AI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]
