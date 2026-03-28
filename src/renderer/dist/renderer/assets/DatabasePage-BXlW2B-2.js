import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, L as LoadingSpinner, i as useDatabaseStore, t as toast, k as DB_TYPES, d as cn, R as RefreshCw, l as Settings, m as Database, X, T as TriangleAlert } from "./index-DwdjykTe.js";
import { T as TypeBadge, S as StatusBadge, P as Pencil, C as ConfirmDialog } from "./ConfirmDialog-DVhQsaID.js";
import { E as EmptyState } from "./EmptyState-B4UvWm3Z.js";
import { F as FolderOpen, C as Check, a as Copy, M as MarkdownRenderer, P as Play } from "./MarkdownRenderer-CecWJxxJ.js";
import { C as CircleCheck, B as Bot } from "./circle-check-2WPuBY6N.js";
import { P as Plus, T as Trash2 } from "./trash-2-BU5Fb0VQ.js";
import { T as TestTube } from "./test-tube-WBwhMlxn.js";
import { C as ChevronDown, a as ChevronRight } from "./chevron-right-Cqw8ZylO.js";
const __iconNode$2 = [
  ["path", { d: "M10 16h.01", key: "1bzywj" }],
  [
    "path",
    {
      d: "M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
      key: "18tbho"
    }
  ],
  ["path", { d: "M21.946 12.013H2.054", key: "zqlbp7" }],
  ["path", { d: "M6 16h.01", key: "1pmjb7" }]
];
const HardDrive = createLucideIcon("hard-drive", __iconNode$2);
const __iconNode$1 = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
];
const Lock = createLucideIcon("lock", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }]
];
const Send = createLucideIcon("send", __iconNode);
function BackupPanel({ connId, onRunBackup }) {
  const [dir, setDir] = reactExports.useState("");
  const [isRunning, setIsRunning] = reactExports.useState(false);
  const [logLines, setLogLines] = reactExports.useState([]);
  const [done, setDone] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const logRef = reactExports.useRef(null);
  const appendLog = (msg, type = "info") => {
    setLogLines((prev) => {
      const next = [...prev, { msg, type, ts: (/* @__PURE__ */ new Date()).toLocaleTimeString() }];
      setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), 20);
      return next;
    });
  };
  const handleRun = async () => {
    if (!dir.trim()) {
      setError("Please set a backup directory first.");
      return;
    }
    setIsRunning(true);
    setLogLines([]);
    setDone(false);
    setError(null);
    try {
      await onRunBackup(connId, dir);
      setDone(true);
      appendLog("✓ Backup completed successfully", "success");
    } catch (err) {
      setError(err.message ?? "Backup failed");
      appendLog(`✗ Error: ${err.message}`, "error");
    } finally {
      setIsRunning(false);
    }
  };
  const LOG_COLORS = { success: "#22c55e", error: "#ef4444", info: "#94a3b8", warning: "#eab308" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-2", children: "Backup Directory" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: dir,
            onChange: (e) => setDir(e.target.value),
            placeholder: "/backups/db  or  C:\\Backups\\DB",
            className: "flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim font-mono"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            title: "Browse for directory",
            onClick: async () => {
              const chosen = await window.api?.deploy?.browseFolder?.({ title: "Select Backup Directory" });
              if (chosen) setDir(chosen);
            },
            className: "px-3 py-2 border border-border-base rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 15 })
          }
        )
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-red-400", children: error })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-lg bg-bg-primary border border-border-base space-y-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-text-muted mb-2", children: "Backup includes:" }),
      [
        "Database schema (DDL)",
        "All table data (DML)",
        "Stored procedures & functions",
        "Views and triggers"
      ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-text-muted", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 12, className: "text-accent-deploy flex-shrink-0" }),
        item
      ] }, item))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: handleRun,
        disabled: isRunning || !dir.trim(),
        className: "w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-60",
        style: { background: "linear-gradient(135deg, #6366f1, #4f46e5)" },
        children: isRunning ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 14, color: "white" }),
          "Backing up…"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { size: 14 }),
          "Run Backup"
        ] })
      }
    ),
    logLines.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim mb-1.5", children: "Backup Log" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: logRef,
          className: "terminal-bg rounded-lg border border-border-base p-3 h-36 overflow-y-auto font-mono text-xs space-y-0.5",
          children: logLines.map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: LOG_COLORS[l.type] ?? "#94a3b8" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "opacity-40 mr-2", children: [
              "[",
              l.ts,
              "]"
            ] }),
            l.msg
          ] }, i))
        }
      )
    ] }),
    done && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 16 }),
      "Backup completed! File saved to: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs ml-1", children: dir })
    ] })
  ] });
}
function ConnectionFormModal({ conn, onSave, onClose }) {
  const PORT_MAP = { mysql: 3306, postgres: 5432, mongodb: 27017, redis: 6379 };
  const [form, setForm] = reactExports.useState(conn ?? {
    name: "",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "",
    database: "",
    uri: "",
    ssl: false,
    authMethod: "password",
    certPath: "",
    caPath: ""
  });
  const isMongo = form.type === "mongodb";
  const isRedis = form.type === "redis";
  const isX509 = isMongo && form.authMethod === "x509";
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const browseFile = async (field) => {
    try {
      const res = await window.api?.dialog?.open({
        title: field === "certPath" ? "Select X.509 Certificate" : "Select CA Certificate",
        filters: [{ name: "PEM", extensions: ["pem", "crt", "key"] }, { name: "All", extensions: ["*"] }],
        properties: ["openFile"]
      });
      const p = res?.filePaths?.[0];
      if (p) f(field, p);
    } catch (_) {
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-border-base sticky top-0 bg-bg-surface z-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-text-primary", children: conn ? "Edit Connection" : "Add Connection" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-text-muted hover:text-text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: (e) => {
        e.preventDefault();
        onSave(form);
        onClose();
      }, className: "p-5 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Database Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: form.type,
              onChange: (e) => {
                const t = e.target.value;
                setForm((p) => ({ ...p, type: t, port: PORT_MAP[t] ?? p.port, authMethod: "password" }));
              },
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none",
              children: Object.entries(DB_TYPES).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: k, children: [
                v.icon,
                " ",
                v.label
              ] }, k))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Connection Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              required: true,
              value: form.name,
              placeholder: "e.g. Production MySQL",
              onChange: (e) => f("name", e.target.value),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
            }
          )
        ] }),
        isMongo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-xs font-medium text-text-muted mb-1", children: [
            "Connection URI ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim", children: "(overrides host/port)" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: form.uri ?? "",
              placeholder: "mongodb+srv://user:pass@cluster.mongodb.net/db",
              onChange: (e) => f("uri", e.target.value),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim font-mono text-xs"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Host" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: form.host ?? "",
                placeholder: "localhost",
                onChange: (e) => f("host", e.target.value),
                className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Port" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: form.port ?? "",
                type: "number",
                placeholder: String(PORT_MAP[form.type] ?? ""),
                onChange: (e) => f("port", parseInt(e.target.value) || PORT_MAP[form.type]),
                className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none"
              }
            )
          ] })
        ] }),
        !isRedis && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Database Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: form.database ?? "",
              placeholder: "app_db",
              onChange: (e) => f("database", e.target.value),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
            }
          )
        ] }),
        isMongo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Auth Method" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: form.authMethod ?? "password",
              onChange: (e) => f("authMethod", e.target.value),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "password", children: "Password" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "x509", children: "X.509 Certificate" })
              ]
            }
          )
        ] }),
        !isX509 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          !isRedis && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Username" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: form.username ?? "",
                placeholder: "root",
                onChange: (e) => f("username", e.target.value),
                className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: isRedis ? "col-span-2" : "", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-xs font-medium text-text-muted mb-1", children: [
              "Password",
              isRedis && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim ml-1", children: "(optional)" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: form.password ?? "",
                type: "password",
                placeholder: "••••••",
                onChange: (e) => f("password", e.target.value),
                className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
              }
            )
          ] })
        ] }),
        isX509 && [["certPath", "X.509 Certificate (.pem)"], ["caPath", "CA Certificate (.pem)"]].map(([field, label]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: form[field] ?? "",
                readOnly: true,
                placeholder: "Click Browse…",
                className: "flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-xs text-text-primary outline-none placeholder:text-text-dim font-mono"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => browseFile(field),
                className: "px-3 py-1.5 text-xs border border-border-base text-text-muted rounded-md hover:bg-bg-hover",
                children: "Browse"
              }
            )
          ] })
        ] }, field)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer select-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: isX509 || (form.ssl ?? false), disabled: isX509, onChange: (e) => f("ssl", e.target.checked), className: "w-4 h-4 accent-indigo-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-text-muted", children: "Enable SSL/TLS" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:bg-bg-hover", children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-1.5 text-sm bg-accent-database hover:bg-indigo-600 text-white rounded-md font-medium", children: conn ? "Save" : "Add Connection" })
        ] })
      ] })
    ] })
  ] });
}
function SchemaRow({ table, isSelected, onSelect, onBrowse }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: cn("cursor-pointer", isSelected && "selected"), onClick: () => onSelect(table.name), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: (e) => {
        e.stopPropagation();
        setExpanded((x) => !x);
      }, className: "text-text-dim", children: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 13 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 13 }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-sm font-medium text-text-primary", children: table.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-text-dim text-xs", children: table.engine }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs text-text-primary", children: table.rows?.toLocaleString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-text-dim text-xs", children: table.columns }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-text-dim text-xs", children: table.size }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-[10px] text-text-dim", children: table.collation }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onBrowse && onBrowse(table.name);
          },
          className: "text-[10px] px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-colors",
          children: "Browse"
        }
      ) })
    ] }),
    expanded && table.columnDetails?.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-indigo-500/5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pl-6 font-mono text-xs text-text-muted", children: col.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-xs text-text-dim", children: col.type }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
        col.key === "PRI" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", children: "PK" }),
        col.key === "UNI" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge bg-blue-500/20 text-blue-400 border border-blue-500/30", children: "UNI" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-xs text-text-dim", children: col.nullable ? "null" : "" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-xs font-mono text-text-dim", children: col.default }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
    ] }, col.name))
  ] });
}
function ChatTab({ messages, input, onInputChange, onSend, isLoading, onRunSql, setQueryText }) {
  const SUGGESTIONS = [
    "How many rows in each table?",
    "Show 10 most recent records",
    "Tables with 1000+ rows",
    "Generate UPDATE for old records"
  ];
  const DML_KEYWORDS = ["UPDATE", "DELETE", "INSERT", "DROP", "ALTER", "TRUNCATE", "CREATE", "REPLACE"];
  const isDml = (sql) => {
    if (!sql) return false;
    const first = sql.trim().split(/\s+/)[0].toUpperCase();
    return DML_KEYWORDS.includes(first);
  };
  const renderChatMessage = (msg) => {
    if (msg.role === "user") return /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap font-sans", children: msg.content });
    const parts = [];
    if (msg.sql && isDml(msg.sql)) {
      parts.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 13 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "⚠ DML Operation" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim ml-1", children: "— This query modifies data. Review carefully before executing." })
        ] }, "dml-warn")
      );
    }
    if (msg.content) {
      parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap font-sans text-text-muted leading-relaxed", children: msg.content }, "text"));
    }
    if (msg.sql) {
      parts.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 rounded-lg border border-border-base overflow-hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-border-base", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono text-text-dim uppercase tracking-wider", children: "SQL" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => navigator.clipboard.writeText(msg.sql),
                  className: "text-[10px] px-2 py-0.5 rounded text-text-dim hover:text-text-muted border border-border-base/50 hover:bg-bg-hover",
                  children: "Copy"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    if (setQueryText) setQueryText(msg.sql);
                    toast.info("SQL sent to Query Runner");
                  },
                  className: "text-[10px] px-2 py-0.5 rounded text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10",
                  children: "→ Query Runner"
                }
              ),
              onRunSql && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => onRunSql(msg.sql),
                  className: "text-[10px] px-2 py-0.5 rounded text-green-400 hover:text-green-300 border border-green-500/30 hover:bg-green-500/10 flex items-center gap-1",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 9 }),
                    "Run"
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "p-3 bg-black/20 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-xs text-green-400 whitespace-pre", children: msg.sql }) })
        ] }, "sql")
      );
    }
    if (msg.queryResult && msg.queryResult.rows?.length > 0) {
      const { columns, rows } = msg.queryResult;
      const colNames = columns.map((c) => c.name ?? c);
      parts.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 max-h-48 overflow-auto rounded-lg border border-border-base", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "data-table w-full", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-bg-surface", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-8 text-center text-text-dim", children: "#" }),
              colNames.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: c }, c))
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.slice(0, 50).map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-bg-hover/30", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center text-text-dim text-[10px]", children: i + 1 }),
              Array.isArray(row) ? row.map((cell, j) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs max-w-[150px] truncate", children: cell == null ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim italic", children: "NULL" }) : String(cell) }, j)) : colNames.map((c) => {
                const v = row[c];
                return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs max-w-[150px] truncate", children: v == null ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim italic", children: "NULL" }) : String(v) }, c);
              })
            ] }, i)) })
          ] }),
          rows.length > 50 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-1 text-[10px] text-text-dim bg-bg-surface/50 border-t border-border-base", children: [
            "Showing first 50 of ",
            rows.length,
            " rows"
          ] })
        ] }, "result")
      );
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: parts });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-4", children: !messages.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full gap-4 pb-16", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { size: 32, className: "text-accent-database" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-text-primary", children: "Chat with your Database" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-muted mt-1", children: "Ask in plain English. I'll generate & run the query for you." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 max-w-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { size: 12 }),
        "AI only executes read-only queries. Write operations are shown for review."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 max-w-sm w-full mt-2", children: SUGGESTIONS.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            onInputChange(s);
            onSend(s);
          },
          className: "text-left text-xs px-3 py-2 rounded-lg border border-border-base bg-bg-primary hover:border-accent-database hover:bg-indigo-500/5 text-text-muted transition-colors",
          children: s
        },
        s
      )) })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      messages.map((msg) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex gap-3", msg.role === "user" && "justify-end"), children: [
        msg.role === "assistant" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { size: 14, className: "text-indigo-400" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
          "max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed",
          msg.role === "user" ? "bg-indigo-500/20 text-text-primary border border-indigo-500/30" : "bg-bg-primary border border-border-base text-text-muted"
        ), children: renderChatMessage(msg) })
      ] }, msg.id)),
      isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { size: 14, className: "text-indigo-400" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-4 py-3 rounded-xl border border-border-base bg-bg-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 13, color: "#6366f1" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-text-muted", children: "Thinking…" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border-base p-3 flex gap-2 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: input,
          onChange: (e) => onInputChange(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(input);
            }
          },
          placeholder: "Ask anything about your database…",
          className: "flex-1 bg-bg-primary border border-border-base rounded-lg px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => onSend(input),
          disabled: !input.trim() || isLoading,
          className: "px-3 py-2 bg-accent-database hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { size: 14 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-2 text-[10px] text-text-dim text-center", children: "Press Enter to send · Shift+Enter for new line" })
  ] });
}
function QueryTab({ queryText, queryResult, isRunning, onTextChange, onRun, onClear, onAiGenerate, connId }) {
  const [typeBadge, setTypeBadge] = reactExports.useState({ label: "SELECT", safe: true });
  const DML_TYPES = ["UPDATE", "DELETE", "INSERT", "DROP", "ALTER", "TRUNCATE", "CREATE", "REPLACE"];
  const checkType = (sql) => {
    const first = (sql || "").trim().split(/\s+/)[0].toUpperCase();
    setTypeBadge(DML_TYPES.includes(first) ? { label: `⚠ ${first}`, safe: false } : { label: first || "SELECT", safe: true });
  };
  const isDmlResult = queryResult && !typeBadge.safe && (queryResult.rows?.length ?? 0) === 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full gap-3 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-text-primary", children: "SQL Editor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-[10px] px-2 py-0.5 rounded font-mono font-semibold", typeBadge.safe ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"), children: typeBadge.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClear, className: "text-xs px-2 py-1 border border-border-base text-text-dim rounded hover:bg-bg-hover", children: "🗑 Clear" }),
        onAiGenerate && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onAiGenerate(connId), className: "text-xs px-2 py-1 border border-border-base text-text-dim rounded hover:bg-bg-hover", children: "🤖 AI Generate" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        value: queryText,
        onChange: (e) => {
          onTextChange(e.target.value);
          checkType(e.target.value);
        },
        className: "w-full h-32 bg-bg-primary border border-border-base rounded-lg p-3 font-mono text-sm text-text-primary focus:border-border-focus outline-none resize-none placeholder:text-text-dim",
        placeholder: "-- Write your SQL here\nSELECT * FROM users LIMIT 10"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => onRun(queryText),
        disabled: isRunning,
        className: "flex items-center gap-2 px-4 py-2 bg-accent-database hover:bg-indigo-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60",
        children: isRunning ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 13, color: "white" }),
          "Running…"
        ] }) : "▶ Run Query"
      }
    ) }),
    isDmlResult && queryResult && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 20, className: "text-green-400" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-green-400", children: queryResult.affectedRows != null ? `${queryResult.affectedRows} row${queryResult.affectedRows !== 1 ? "s" : ""} affected` : `Query executed successfully` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-text-dim mt-0.5", children: [
          "Completed in ",
          queryResult.time,
          "ms"
        ] })
      ] })
    ] }),
    queryResult && !isDmlResult && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-auto border border-border-base rounded-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-1.5 border-b border-border-base text-[10px] text-text-dim bg-bg-surface/50", children: [
        queryResult.rowCount,
        " row",
        queryResult.rowCount !== 1 ? "s" : "",
        " · ",
        queryResult.time,
        "ms",
        queryResult.affectedRows != null && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          " · ",
          queryResult.affectedRows,
          " affected"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "data-table", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: queryResult.columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: c }, c)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: queryResult.rows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: queryResult.columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs", children: row[c] == null ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim italic", children: "NULL" }) : String(row[c]) }, c)) }, i)) })
      ] })
    ] })
  ] });
}
function DataBrowserModal({ connId, tableName, onClose }) {
  const [page, setPage] = reactExports.useState(1);
  const [pageSize, setPageSize] = reactExports.useState(50);
  const [filter, setFilter] = reactExports.useState("");
  const [filterInput, setFilterInput] = reactExports.useState("");
  const [data, setData] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const load = async (p = page, ps = pageSize, f = filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.db.browseTable({ connId, tableName, page: p, pageSize: ps, filter: f });
      if (res?.ok) setData(res);
      else setError(res?.error ?? "Failed to load data");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  reactExports.useEffect(() => {
    load(1, pageSize, "");
  }, [connId, tableName]);
  const goPage = (p) => {
    const clamped = Math.max(1, Math.min(p, data?.totalPages ?? 1));
    setPage(clamped);
    load(clamped, pageSize, filter);
  };
  const applyFilter = () => {
    setFilter(filterInput);
    setPage(1);
    load(1, pageSize, filterInput);
  };
  const clearFilter = () => {
    setFilter("");
    setFilterInput("");
    setPage(1);
    load(1, pageSize, "");
  };
  const changePageSize = (ps) => {
    setPageSize(ps);
    setPage(1);
    load(1, ps, filter);
  };
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, data?.total ?? 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-bg-surface border border-border-base rounded-xl shadow-2xl flex flex-col", style: { width: "90vw", height: "85vh", maxWidth: 1200 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-border-base flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sm text-text-primary font-mono", children: tableName }),
      data && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-dim", children: [
        "(",
        data.total?.toLocaleString(),
        " rows)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 ml-4 flex-1 max-w-md", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: filterInput,
            onChange: (e) => setFilterInput(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && applyFilter(),
            placeholder: "Filter (WHERE clause or JSON for Mongo)…",
            className: "flex-1 bg-bg-primary border border-border-base rounded-md px-2.5 py-1 text-xs text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: applyFilter, className: "px-2 py-1 text-xs border border-border-base text-text-muted rounded hover:bg-bg-hover", children: "Apply" }),
        filter && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: clearFilter, className: "px-2 py-1 text-xs border border-border-base text-red-400 rounded hover:bg-bg-hover", children: "Clear" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "ml-auto text-text-dim hover:text-text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-auto", children: [
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full text-text-dim", children: "Loading…" }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center h-full text-red-400", children: [
        "❌ ",
        error
      ] }),
      data && !loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "data-table w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 z-10 bg-bg-surface", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-10 text-center text-text-dim", children: "#" }),
          data.columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: c.name ?? c }, c.name ?? c))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          data.rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: data.columns.length + 1, className: "text-center py-8 text-text-dim italic", children: "No rows found." }) }),
          data.rows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-bg-hover/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-center text-text-dim text-[10px]", children: startRow + i }),
            Array.isArray(row) ? row.map((cell, j) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs max-w-[200px] truncate", title: cell == null ? "NULL" : String(cell), children: cell == null ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim italic", children: "NULL" }) : String(cell).length > 200 ? String(cell).substring(0, 200) + "…" : String(cell) }, j)) : data.columns.map((c) => {
              const k = c.name ?? c;
              const v = row[k];
              return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs max-w-[200px] truncate", title: v == null ? "NULL" : String(v), children: v == null ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim italic", children: "NULL" }) : String(v).length > 200 ? String(v).substring(0, 200) + "…" : String(v) }, k);
            })
          ] }, i))
        ] })
      ] })
    ] }),
    data && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-t border-border-base flex-shrink-0 bg-bg-surface/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-dim", children: [
        "Showing ",
        startRow.toLocaleString(),
        "–",
        endRow.toLocaleString(),
        " of ",
        data.total.toLocaleString(),
        " rows"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: page <= 1, onClick: () => goPage(1), className: "px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover", children: "⏮" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: page <= 1, onClick: () => goPage(page - 1), className: "px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover", children: "◀" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            value: page,
            min: 1,
            max: data.totalPages,
            onChange: (e) => goPage(parseInt(e.target.value) || 1),
            className: "w-12 text-center bg-bg-primary border border-border-base rounded text-xs text-text-primary outline-none py-1"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-dim", children: [
          "/ ",
          data.totalPages
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: page >= data.totalPages, onClick: () => goPage(page + 1), className: "px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover", children: "▶" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: page >= data.totalPages, onClick: () => goPage(data.totalPages), className: "px-2 py-1 text-xs border border-border-base rounded disabled:opacity-40 hover:bg-bg-hover", children: "⏭" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            value: pageSize,
            onChange: (e) => changePageSize(+e.target.value),
            className: "bg-bg-primary border border-border-base rounded text-xs text-text-primary outline-none py-1 px-1.5",
            children: [25, 50, 100, 200].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: n, children: [
              n,
              "/page"
            ] }, n))
          }
        )
      ] })
    ] })
  ] }) });
}
function CliToolsPanel({ connType }) {
  const [cliPaths, setCliPaths] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const TOOL_MAP = {
    mysql: { name: "mysqldump", icon: "🐬" },
    postgres: { name: "pg_dump", icon: "🐘" },
    mongodb: { name: "mongodump", icon: "🍃" },
    redis: { name: "redis-cli", icon: "🔴" }
  };
  reactExports.useEffect(() => {
    const load = async () => {
      try {
        const res = await window.api.db.getCliPaths();
        setCliPaths(res ?? {});
      } catch (_) {
        setCliPaths({});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  const browseTool = async (toolName) => {
    try {
      const res = await window.api.db.browseCliPath({ tool: toolName });
      if (res?.path) {
        const updated = { ...cliPaths, [toolName]: res.path };
        setCliPaths(updated);
        await window.api.db.saveCliPaths(updated);
        toast.success(`${toolName} path saved`);
      }
    } catch (_) {
    }
  };
  const clearTool = async (toolName) => {
    const updated = { ...cliPaths };
    delete updated[toolName];
    setCliPaths(updated);
    await window.api.db.saveCliPaths(updated);
    toast.info(`${toolName} path cleared — using auto-detection`);
  };
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 14 }) });
  const tool = TOOL_MAP[connType];
  if (!tool) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-dim py-2", children: "No CLI tool for this database type." });
  const hasCustom = cliPaths?.[tool.name];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim mb-2", children: "CLI Tools" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-2.5 rounded-lg border border-border-base bg-bg-primary", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base", children: tool.icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-mono text-text-primary", children: tool.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim truncate", children: hasCustom ? cliPaths[tool.name] : "Auto-detect (system PATH)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(
        "text-[9px] px-1.5 py-0.5 rounded font-mono",
        hasCustom ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"
      ), children: hasCustom ? "CUSTOM" : "AUTO" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => browseTool(tool.name),
          className: "text-[10px] px-2 py-0.5 rounded border border-border-base text-text-muted hover:bg-bg-hover",
          children: "Browse"
        }
      ),
      hasCustom && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => clearTool(tool.name),
          className: "text-[10px] text-text-dim hover:text-red-400",
          children: "✕"
        }
      )
    ] })
  ] });
}
function DatabasePage() {
  const {
    connections,
    selectedConnId,
    schema,
    selectedTable,
    lastDiagnostics,
    activeTab,
    chatMessages,
    chatInput,
    isChatLoading,
    queryText,
    queryResult,
    isRunningQuery,
    isAiAnalyzing,
    aiAnalysisResult,
    backupDir,
    isRunningBackup,
    backupLog,
    loadConnections,
    selectConnection,
    selectTable,
    setActiveTab,
    testConnection,
    fetchSchema,
    runDiagnostics,
    runAiAnalysis,
    sendChatMessage,
    setChatInput,
    setQueryText,
    runQuery,
    saveConnection,
    deleteConnection,
    runBackup,
    setBackupDir
  } = useDatabaseStore();
  const [connModal, setConnModal] = reactExports.useState(null);
  const [confirmDelete, setConfirmDelete] = reactExports.useState(null);
  const [connFilter, setConnFilter] = reactExports.useState("");
  const [dataBrowser, setDataBrowser] = reactExports.useState(null);
  const [aiCopied, setAiCopied] = reactExports.useState(false);
  const [showCliTools, setShowCliTools] = reactExports.useState(false);
  const copyAiResult = () => {
    if (aiAnalysisResult?.analysis) {
      navigator.clipboard.writeText(aiAnalysisResult.analysis);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 1500);
    }
  };
  const handleAiGenerate = async (connId) => {
    const prompt = window.prompt('Describe the query you want AI to generate:\n\nExample: "Show all orders from last 7 days"');
    if (!prompt?.trim()) return;
    setQueryText("-- Generating with AI…");
    try {
      const res = await window.api.db.chatQuery({ connId, question: prompt, schema: JSON.stringify(schema?._raw || {}), generateOnly: true });
      if (res?.ok && res.sql) {
        setQueryText(res.sql);
        toast.success("AI query generated!");
      } else toast.error(res?.error ?? "AI failed to generate query");
    } catch (e) {
      toast.error(e.message);
    }
  };
  const handleRunSqlFromChat = reactExports.useCallback(async (sql) => {
    if (!selectedConnId || !sql) return;
    try {
      const t0 = Date.now();
      const res = await window.api.db.runQuery({ connId: selectedConnId, sql });
      const elapsed = Date.now() - t0;
      if (res?.ok) {
        const columns = (res.columns ?? []).map((c) => c.name ?? c);
        const rawRows = res.rows ?? [];
        const rows = rawRows.map((row) => Array.isArray(row) ? Object.fromEntries(columns.map((c, i) => [c, row[i]])) : row);
        toast.success(`Query returned ${rows.length} rows in ${elapsed}ms`);
      } else {
        toast.error(res?.error ?? "Query failed");
      }
    } catch (err) {
      toast.error(err.message);
    }
  }, [selectedConnId]);
  const selectedConn = connections.find((c) => c.id === selectedConnId);
  const filteredConns = connFilter ? connections.filter((c) => c.name.toLowerCase().includes(connFilter.toLowerCase())) : connections;
  reactExports.useEffect(() => {
    loadConnections();
  }, []);
  const TABS = [
    { id: "schema", label: "Schema" },
    { id: "chat", label: "Chat with DB" },
    { id: "query", label: "Query Runner" },
    { id: "backup", label: "💾 Backup" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col bg-bg-surface border-r border-border-base overflow-hidden", style: { width: 250, minWidth: 200 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3 py-2.5 border-b border-border-base flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim", children: "Connections" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setConnModal({ mode: "add" }), className: "text-accent-database text-xs flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 12 }),
          "Add"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 border-b border-border-base flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: connFilter,
          onChange: (e) => setConnFilter(e.target.value),
          placeholder: "Filter…",
          className: "w-full bg-bg-primary border border-border-base rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto py-1", children: filteredConns.map((conn) => {
        const dtype = DB_TYPES[conn.type];
        const isSel = conn.id === selectedConnId;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn("relative flex flex-col px-3 py-2.5 cursor-pointer group transition-colors hover:bg-bg-hover/60", isSel && "bg-bg-hover border-l-2 border-accent-database"),
            onClick: () => selectConnection(conn.id),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base leading-none", children: dtype?.icon }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-text-primary truncate", children: conn.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-mono text-text-dim truncate", children: conn.uri ? "URI mode" : `${conn.host}:${conn.port}` })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-end gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TypeBadge, { label: dtype?.label, color: dtype?.color, bg: dtype?.bg }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: conn.status, dot: false })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-bg-surface border border-border-base rounded-md shadow-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      setConnModal({ mode: "edit", conn });
                    },
                    className: "p-1.5 text-text-dim hover:text-accent-database rounded-l-md hover:bg-bg-hover transition-colors",
                    title: "Edit",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { size: 11 })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      setConfirmDelete(conn.id);
                    },
                    className: "p-1.5 text-text-dim hover:text-red-400 rounded-r-md hover:bg-bg-hover transition-colors",
                    title: "Delete",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 11 })
                  }
                )
              ] })
            ]
          },
          conn.id
        );
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "resize-divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
      selectedConn && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-4 py-2.5 border-b border-border-base bg-bg-surface/60 flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg", children: DB_TYPES[selectedConn.type]?.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-text-primary text-sm", children: selectedConn.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-xs text-text-dim ml-2", children: [
            selectedConn.host,
            ":",
            selectedConn.port
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TypeBadge, { label: DB_TYPES[selectedConn.type]?.label, color: DB_TYPES[selectedConn.type]?.color, bg: DB_TYPES[selectedConn.type]?.bg }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: async () => {
                const res = await testConnection(selectedConnId);
                if (res?.ok) toast.success(`OK — ${res.version}`);
                else toast.error(res?.error ?? "Test failed");
              },
              className: "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TestTube, { size: 12 }),
                "Test"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => runDiagnostics(selectedConnId),
              className: "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 12 }),
                "Diagnostics"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => runAiAnalysis(selectedConnId),
              disabled: isAiAnalyzing,
              className: "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50",
              children: isAiAnalyzing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 12, color: "#6366f1" }),
                "Analyzing…"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { size: 12 }),
                "AI Analyze"
              ] })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 px-3 py-2 border-b border-border-base bg-bg-surface/40 flex-shrink-0", children: TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setActiveTab(t.id),
          className: cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", activeTab === t.id ? "bg-accent-database/20 text-accent-database" : "text-text-muted hover:text-text-primary hover:bg-bg-hover"),
          children: t.label
        },
        t.id
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex-1 overflow-hidden", activeTab !== "chat" && "overflow-y-auto"), children: [
        activeTab === "schema" && schema && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-2 border-b border-border-base bg-bg-surface/30 flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-dim", children: [
            schema.summary?.tables,
            " tables · ",
            schema.summary?.totalRows?.toLocaleString(),
            " total rows · ",
            schema.summary?.totalSize
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "data-table", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-bg-surface z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-8" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Table Name" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Engine" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Rows" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Columns" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Size" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Collation" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: schema.items?.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              SchemaRow,
              {
                table: t,
                isSelected: selectedTable === t.name,
                onSelect: selectTable,
                onBrowse: (name) => setDataBrowser({ tableName: name })
              },
              t.name
            )) })
          ] })
        ] }),
        activeTab === "chat" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChatTab,
          {
            messages: chatMessages,
            input: chatInput,
            isLoading: isChatLoading,
            onInputChange: setChatInput,
            onSend: (msg) => {
              if (msg.trim()) sendChatMessage(msg);
            },
            onRunSql: handleRunSqlFromChat,
            setQueryText
          }
        ),
        activeTab === "query" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          QueryTab,
          {
            queryText,
            queryResult,
            isRunning: isRunningQuery,
            onTextChange: setQueryText,
            onRun: runQuery,
            onClear: () => {
              setQueryText("");
            },
            connId: selectedConnId,
            onAiGenerate: handleAiGenerate
          }
        ),
        activeTab === "backup" && selectedConn && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 max-w-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(BackupPanel, { connId: selectedConnId, onRunBackup: runBackup }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => setShowCliTools((v) => !v),
                className: "flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { size: 12 }),
                  showCliTools ? "Hide" : "Show",
                  " CLI Tools Settings"
                ]
              }
            ),
            showCliTools && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CliToolsPanel, { connType: selectedConn.type }) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "resize-divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col bg-bg-surface border-l border-border-base overflow-y-auto", style: { width: 260, minWidth: 200 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 space-y-4", children: selectedTable && schema?.items?.find((t) => t.name === selectedTable) ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim mb-2", children: "Table Details" }),
        Object.entries(schema.items.find((t) => t.name === selectedTable) || {}).filter(([k]) => !["columnDetails", "name"].includes(k)).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between py-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-text-muted capitalize", children: k }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono text-text-primary", children: typeof v === "number" ? v.toLocaleString() : v })
        ] }, k))
      ] }),
      lastDiagnostics?.checks && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border-base pt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim mb-2", children: "Diagnostics" }),
        lastDiagnostics.version && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between py-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-text-muted", children: "Version" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono text-text-primary", children: lastDiagnostics.version })
        ] }),
        lastDiagnostics.checks.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between py-1 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-muted flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: c.status === "pass" ? "✅" : c.status === "warn" ? "⚠️" : c.status === "fail" ? "❌" : "ℹ️" }),
            c.label
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono text-text-primary text-right max-w-[140px] truncate", title: c.detail, children: c.detail })
        ] }, c.id))
      ] }),
      aiAnalysisResult && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border-base pt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim", children: "AI Analysis" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: copyAiResult,
              className: "text-[10px] px-2 py-0.5 rounded border border-border-base text-text-muted hover:bg-bg-hover flex items-center gap-1",
              children: aiCopied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 10 }),
                "Copied!"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 10 }),
                "Copy"
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownRenderer, { content: aiAnalysisResult.analysis ?? "" }),
          aiAnalysisResult.provider && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[10px] text-text-dim", children: [
            "via ",
            aiAnalysisResult.provider,
            " · ",
            aiAnalysisResult.model
          ] })
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Database, title: "Select a table", message: "Click a table row to see details and indexes." }) }) }),
    connModal && /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionFormModal, { conn: connModal.conn, onSave: (c) => {
      saveConnection(c);
      toast.success("Connection saved");
    }, onClose: () => setConnModal(null) }),
    dataBrowser && selectedConnId && /* @__PURE__ */ jsxRuntimeExports.jsx(DataBrowserModal, { connId: selectedConnId, tableName: dataBrowser.tableName, onClose: () => setDataBrowser(null) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        isOpen: !!confirmDelete,
        title: "Delete Connection",
        message: "Are you sure?",
        confirmLabel: "Delete",
        onConfirm: () => {
          deleteConnection(confirmDelete);
          toast.success("Deleted");
          setConfirmDelete(null);
        },
        onCancel: () => setConfirmDelete(null)
      }
    )
  ] });
}
export {
  DatabasePage as default
};
