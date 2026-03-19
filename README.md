<div align="center">

<img src="resources/icon.png" alt="Zevitsoft Deployment Manager" width="120" />

# Zevitsoft Deployment Manager V2

> **All-in-one DevOps desktop application** — Manage deployments, servers, firewalls, databases, and Cloudflare from a single dashboard.

![Electron](https://img.shields.io/badge/Electron-39-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-API-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

</div>

---

A comprehensive desktop application built with **Electron + React** for managing the full lifecycle of your server infrastructure. Originally designed for dynamically updating cloud firewalls with your public IP, it has evolved into a full-featured DevOps control panel — handling deployments, SSH sessions, database diagnostics, Cloudflare DNS/Tunnel management, and AI-powered security scanning.

---

## 🚀 Key Features

### 🛡️ Firewall Manager
Automatically update cloud firewall rules with your current public IP address.

- **Google Cloud Platform** — Update Compute Engine & Cloud SQL authorized networks via `gcloud` CLI
- **DigitalOcean** — Manage inbound rules for cloud firewalls via API
- **MongoDB Atlas** — IP Access List management using Admin API v2
- **Multi-IP Detection** — Concurrent IPv4 and IPv6 (Global/Local) detection

### 📦 Deployment Automator
Deploy applications to remote SSH servers with configurable, step-by-step pipelines.

- **PM2 Backend Deploy** — Full pipeline: Git Pull → npm install → Build → PM2 Restart → Health Check
- **Static Web Deploy** — Local Build → Archive → SFTP Upload → Backup → Extract
- **Cloudflare Pages** — Seamless Wrangler deployments for Pages and Workers
- **Selective Steps** — Choose which pipeline steps to skip, customize commands per-step
- **Persistent Config** — Pipeline customizations are remembered per-project

### 🌩️ Cloudflare Manager
Multi-account Cloudflare integration for DNS and Tunnel management.

- **Multi-Account** — Add and manage multiple Cloudflare accounts (Global API Key or Scoped Tokens)
- **DNS Records** — Full CRUD operations with automatic server-IP cross-referencing
- **Domain Sync** — Detect domains missing from Cloudflare vs. local server configurations
- **Domain Expiry** — Track domain expiration dates via Cloudflare Registrar or WHOIS API
- **Tunnels** — List, create, and manage Cloudflare Tunnels (Zero Trust)
- **Encrypted Cache** — Fast responses with locally encrypted domain and WHOIS data (AES-256-CBC)

### 🗄️ Database Management
Connect, diagnose, and backup databases over SSH tunnels.

- **Engines** — MySQL, PostgreSQL, MongoDB, Redis
- **Health Checks** — Fragmentation analysis, slow query logs, missing primary keys, index usage, cache hit rates
- **Backups** — Stream CLI-based backups (`mysqldump`, `pg_dump`, `mongodump`, `redis-cli`) directly to your local machine
- **Query Browser** — Execute queries and view results in a tabular interface

### 📂 Remote File Manager (SFTP)
Full-featured visual file browser over SFTP.

- **File Explorer** — Navigate, rename, delete, create files and folders
- **Code Editor** — Edit remote config files directly with save support (Ctrl+S)
- **Transfers** — Upload and download files with progress indicators

### 🖥️ Integrated Terminal
Built-in SSH terminal using `xterm.js` with full PTY support.

- Real-time interactive session with the connected server
- Resizable terminal panel with fit-to-container support
- Direct command execution alongside deployment operations

### 🤖 AI-Powered Diagnostics
Server security and health analysis powered by AI.

- **Gemini CLI Mode** — Uses your locally installed [Gemini CLI](https://github.com/anthropics/gemini-cli) credentials (free via Google AI)
- **API Key Mode** — Round-robin through Groq (Qwen3 32B) and Gemini API keys as fallback
- Security scoring based on UFW, SSH config, and open ports
- Nginx/Apache access log analysis for error-causing IPs and bot traffic
- System process and PM2 health auditing with actionable optimization suggestions

### ⚙️ Server Health Monitoring
Real-time server metrics displayed in the sidebar.

- CPU, RAM, and Disk usage gauges with auto-refresh (10s interval)
- Load average, uptime, and restart count monitoring
- PM2 process list with restart, stop, and log viewing capabilities

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Electron 39 |
| **Frontend** | React 19 + Vite 7 |
| **Styling** | Tailwind CSS 3 |
| **State** | Zustand 5 |
| **Terminal** | xterm.js 6 (Fit + Web Links addons) |
| **SSH/SFTP** | ssh2 |
| **DB Clients** | mysql2, pg, mongodb, ioredis |
| **HTTP** | axios |
| **AI** | google-auth-library (Gemini CLI), Groq API, Gemini API |
| **Charts** | Recharts |
| **Build** | electron-vite + electron-builder |

---

## 📁 Project Structure

```
zevitsoftDeploymentManagerV2/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── ipc/               # IPC handlers
│   │   │   ├── authHandlers   #   Google Cloud authentication
│   │   │   ├── firewallHandlers  #   GCP/DO/Atlas firewall updates
│   │   │   ├── cf/            #   Cloudflare (accounts, DNS, zones, tunnels)
│   │   │   ├── db/            #   Database (connect, diagnostics, backup)
│   │   │   └── deploy/        #   Deploy (config, actions, SFTP, terminal)
│   │   ├── services/          # Core services
│   │   │   ├── aiProvider     #   Unified AI provider (Gemini CLI / API Keys)
│   │   │   ├── configStore    #   Encrypted config I/O (AES-256-CBC)
│   │   │   ├── deployEngine   #   Step-based deployment pipeline
│   │   │   ├── sshManager     #   SSH connection pool & session management
│   │   │   ├── nginxParser    #   Nginx config parser
│   │   │   └── serverScanner  #   Remote project discovery (PM2/static/systemd)
│   │   └── workers/           # Worker threads (bulk API, health checks)
│   ├── renderer/              # React frontend (Vite)
│   │   └── src/
│   │       ├── pages/         #   Feature pages (firewall, deploy, cloudflare, db, settings)
│   │       ├── stores/        #   Zustand state stores
│   │       ├── components/    #   Shared UI components
│   │       └── lib/           #   Utilities & constants
│   ├── preload/               # Context bridge (secure IPC API)
│   └── shared/                # Shared channel names
├── resources/                 # App icons
├── scripts/                   # Dev/debug helper scripts
└── electron-builder.yml       # Build configuration
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org/))
- **Git** ([download](https://git-scm.com/))
- **Google Cloud CLI** (optional, for GCP firewall targets) — [install](https://cloud.google.com/sdk/docs/install)
- **Gemini CLI** (optional, for AI features) — `npm install -g @google/gemini-cli`

### Install

```bash
git clone https://github.com/ArekZevique/zevitsoft-deployment-manager-v2.git
cd zevitsoft-deployment-manager-v2
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
# Windows (Portable + NSIS Installer)
npm run build:win

# macOS
npm run build:mac

# Linux (AppImage + deb)
npm run build:linux
```

Build output goes to the `dist/` directory.

---

## ⚙️ Configuration

All configuration is stored **locally** on your machine in an encrypted file (`targets.enc`) located in your Electron `userData` directory. No data is sent to external servers.

| Setting | Where |
|---|---|
| Server connections (SSH) | Stored in encrypted `targets.enc` |
| Cloudflare accounts | Stored in encrypted `targets.enc` |
| AI API keys | Stored in encrypted `targets.enc` |
| Gemini CLI credentials | Uses `~/.gemini/oauth_creds.json` (managed by Gemini CLI) |
| GCP Authentication | Uses `gcloud` CLI auth state |

---

## 🔐 Security

- **Local-Only Storage** — All credentials, API tokens, and server configs are encrypted with AES-256-CBC and stored locally. No external servers involved.
- **No Hardcoded Secrets** — OAuth credentials for Gemini CLI integration are dynamically extracted from the installed Gemini CLI package at runtime.
- **SSH Best Practices** — Supports both password and SSH key authentication (`.pem`, `.ppk`). Key passphrases supported.
- **Context Isolation** — Electron context isolation and secure IPC via preload scripts.

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [Zevitsoft](https://zevitsoft.com/)**

</div>
