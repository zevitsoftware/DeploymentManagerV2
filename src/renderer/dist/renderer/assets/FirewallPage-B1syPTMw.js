import { c as createLucideIcon, u as useFirewallStore, r as reactExports, j as jsxRuntimeExports, S as Shield, a as Square, F as FW_PROVIDERS, b as relativeTime, t as toast, R as RefreshCw, L as LoadingSpinner } from "./index-DwdjykTe.js";
import { T as TypeBadge, S as StatusBadge, P as Pencil, C as ConfirmDialog } from "./ConfirmDialog-DVhQsaID.js";
import { E as EyeOff } from "./eye-off-yGLETOZI.js";
import { E as Eye } from "./eye-DTUAvYMY.js";
import { P as Plus, T as Trash2 } from "./trash-2-BU5Fb0VQ.js";
import { T as Terminal } from "./terminal-Blxj5M8Y.js";
const __iconNode$1 = [
  [
    "path",
    { d: "M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344", key: "2acyp4" }
  ],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
];
const SquareCheckBig = createLucideIcon("square-check-big", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      key: "1xq2db"
    }
  ]
];
const Zap = createLucideIcon("zap", __iconNode);
function TargetFormModal({ target, onSave, onClose }) {
  const [form, setForm] = reactExports.useState(target ?? {
    provider: "gcp",
    description: "",
    project: "",
    firewallName: ""
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-border-base", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-text-primary", children: target ? "Edit Firewall Target" : "Add Firewall Target" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-text-muted hover:text-text-primary", children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "p-5 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1.5", children: "Provider" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: form.provider,
              onChange: (e) => setForm((f) => ({ ...f, provider: e.target.value })),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none",
              children: Object.entries(FW_PROVIDERS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v.label }, k))
            }
          )
        ] }),
        [
          { key: "description", label: "Description", placeholder: "e.g. Production API Server" },
          { key: "project", label: "Project / Resource", placeholder: "e.g. my-gcp-project" },
          { key: "firewallName", label: "Firewall / Rule Name", placeholder: "e.g. default-allow-ssh" }
        ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1.5", children: f.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: form[f.key] ?? "",
              onChange: (e) => setForm((s) => ({ ...s, [f.key]: e.target.value })),
              placeholder: f.placeholder,
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
            }
          )
        ] }, f.key)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: onClose,
              className: "px-4 py-1.5 text-sm border border-border-base text-text-muted hover:text-text-primary rounded-md transition-colors",
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "submit",
              className: "px-4 py-1.5 text-sm bg-accent-firewall hover:bg-red-600 text-white rounded-md font-medium transition-colors",
              children: target ? "Save Changes" : "Add Target"
            }
          )
        ] })
      ] })
    ] })
  ] });
}
function IPCardGrid({ interfaces, onRefresh, isRefreshing }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim", children: "My Public IPs" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: onRefresh,
          disabled: isRefreshing,
          className: "flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 11, className: isRefreshing ? "animate-spin" : "" }),
            "Refresh"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: interfaces.map((iface, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-text-muted", children: iface.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-text-dim font-mono", children: iface.localIp })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-sm font-medium", style: { color: "#22c55e" }, children: iface.publicIp }) })
    ] }, i)) })
  ] });
}
const LOG_COLORS = {
  success: "#22c55e",
  error: "#ef4444",
  warning: "#eab308",
  section: "#818cf8",
  info: "#94a3b8"
};
function LogPanel({ lines, onClear, onUpdateAll, isUpdating, selectedCount }) {
  const bottomRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [lines]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-border-base flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wider", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { size: 12 }),
        "Log Output"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onClear,
            className: "text-xs text-text-dim hover:text-text-muted px-2 py-0.5 rounded transition-colors",
            children: "Clear"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onUpdateAll,
            disabled: isUpdating,
            className: "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md text-white transition-all disabled:opacity-60",
            style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" },
            children: isUpdating ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 11, color: "white" }),
              "Updating…"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 11 }),
              selectedCount > 0 ? `Update Selected (${selectedCount})` : "Update All Firewalls"
            ] })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto p-3 terminal-bg font-mono text-xs leading-relaxed", children: [
      lines.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: LOG_COLORS[line.type] ?? "#94a3b8" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "opacity-50 mr-2", children: [
          "[",
          line.ts,
          "]"
        ] }),
        line.text
      ] }, i)),
      !lines.length && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-text-dim italic", children: 'Ready. Click "Update All Firewalls" to begin.' }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: bottomRef })
    ] })
  ] });
}
function FirewallPage() {
  const {
    targets,
    interfaces,
    logLines,
    selectedIds,
    isUpdating,
    loadTargets,
    refreshIPs,
    updateAllFirewalls,
    clearLog,
    addTarget,
    updateTarget,
    deleteTarget,
    toggleSelect,
    selectAll,
    clearSelection
  } = useFirewallStore();
  const [showIPs, setShowIPs] = reactExports.useState(true);
  const [modal, setModal] = reactExports.useState(null);
  const [confirmId, setConfirmId] = reactExports.useState(null);
  const [isRefreshingIPs, setIsRefreshingIPs] = reactExports.useState(false);
  const [logHeight, setLogHeight] = reactExports.useState(200);
  reactExports.useEffect(() => {
    loadTargets();
  }, []);
  const handleRefreshIPs = async () => {
    setIsRefreshingIPs(true);
    await refreshIPs();
    setIsRefreshingIPs(false);
    toast.success("IPs refreshed");
  };
  const handleUpdateAll = async () => {
    await updateAllFirewalls();
    toast.success("All firewalls updated!");
  };
  const handleSaveTarget = (form) => {
    if (form.id) {
      updateTarget(form.id, form);
    } else {
      addTarget(form);
    }
    toast.success(form.id ? "Target updated" : "Target added");
  };
  const handleDelete = (id) => {
    deleteTarget(id);
    toast.success("Target deleted");
    setConfirmId(null);
  };
  const stats = {
    total: targets.length,
    gcp: targets.filter((t) => {
      const p = (t.provider ?? "").toLowerCase();
      return p === "gcp" || p === "gcpsql";
    }).length,
    do: targets.filter((t) => (t.provider ?? "").toLowerCase() === "do").length,
    atlas: targets.filter((t) => (t.provider ?? "").toLowerCase() === "atlas").length
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "flex flex-col border-r border-border-base bg-bg-surface overflow-y-auto",
        style: { width: 220, minWidth: 180 },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            IPCardGrid,
            {
              interfaces,
              onRefresh: handleRefreshIPs,
              isRefreshing: isRefreshingIPs
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border-base pt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim mb-2", children: "Quick Stats" }),
            [
              { label: "Total Targets", value: stats.total },
              { label: "GCP Rules", value: stats.gcp },
              { label: "DO Rules", value: stats.do },
              { label: "Atlas Rules", value: stats.atlas }
            ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-text-muted", children: s.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-text-primary font-mono", children: s.value })
            ] }, s.label))
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-border-base flex-shrink-0 bg-bg-surface/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 16, className: "text-accent-firewall" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sm text-text-primary", children: "Firewall Targets" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge bg-accent-firewall/20 text-accent-firewall border border-accent-firewall/30 text-xs", children: targets.length })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          selectedIds.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-text-muted", children: [
            selectedIds.length,
            " selected"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setShowIPs(!showIPs),
              className: "flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary border border-border-base px-2.5 py-1 rounded-md transition-colors",
              children: [
                showIPs ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 12 }),
                showIPs ? "Hide IPs" : "Show IPs"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setModal({ mode: "add" }),
              className: "flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-md transition-colors",
              style: { background: "#ef4444" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 12 }),
                "Add Target"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "data-table", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-bg-surface z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: selectedIds.length === targets.length ? clearSelection : selectAll, children: selectedIds.length === targets.length && targets.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(SquareCheckBig, { size: 13, className: "text-accent-firewall" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { size: 13, className: "text-text-dim" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Provider" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Description" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Project / Resource" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Firewall Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Last Updated" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-16", children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          targets.map((t) => {
            const provKey = (t.provider ?? "").toLowerCase();
            const prov = FW_PROVIDERS[provKey] ?? { label: t.provider, color: "#94a3b8", bg: "rgba(148,163,184,0.15)" };
            const isSelected = selectedIds.includes(t.id);
            const desc = t.description ?? t.desc ?? "";
            const project = t.project ?? t.projectId ?? "";
            const fwName = t.firewallName ?? t.ruleName ?? t.sqlInstance ?? t.firewallId ?? "";
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: isSelected ? "selected" : "", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleSelect(t.id), children: isSelected ? /* @__PURE__ */ jsxRuntimeExports.jsx(SquareCheckBig, { size: 13, className: "text-accent-firewall" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { size: 13, className: "text-text-dim" }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TypeBadge, { label: prov.label, color: prov.color, bg: prov.bg }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-medium", children: desc }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs text-text-muted", children: project }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs text-text-muted", children: showIPs ? fwName : "••••••••" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-text-dim text-xs", children: relativeTime(t.lastUpdated) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: t.status }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    title: "Edit",
                    onClick: () => setModal({ mode: "edit", target: t }),
                    className: "p-1 text-text-dim hover:text-text-primary transition-colors rounded",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { size: 13 })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    title: "Delete",
                    onClick: () => setConfirmId(t.id),
                    className: "p-1 text-text-dim hover:text-red-400 transition-colors rounded",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 13 })
                  }
                )
              ] }) })
            ] }, t.id);
          }),
          !targets.length && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, className: "py-16 text-center text-text-dim text-sm", children: 'No firewall targets. Click "+ Add Target" to get started.' }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "resize-divider-h cursor-row-resize" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 border-t border-border-base", style: { height: logHeight }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        LogPanel,
        {
          lines: logLines,
          onClear: clearLog,
          onUpdateAll: handleUpdateAll,
          isUpdating,
          selectedCount: selectedIds.length
        }
      ) })
    ] }),
    modal && /* @__PURE__ */ jsxRuntimeExports.jsx(
      TargetFormModal,
      {
        target: modal.mode === "edit" ? modal.target : null,
        onSave: handleSaveTarget,
        onClose: () => setModal(null)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        isOpen: !!confirmId,
        title: "Delete Target",
        message: "Are you sure you want to remove this firewall target? This cannot be undone.",
        confirmLabel: "Delete",
        onConfirm: () => handleDelete(confirmId),
        onCancel: () => setConfirmId(null)
      }
    )
  ] });
}
export {
  FirewallPage as default
};
