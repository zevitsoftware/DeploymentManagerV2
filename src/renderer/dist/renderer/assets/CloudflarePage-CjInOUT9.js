import { c as createLucideIcon, n as useCloudflareStore, r as reactExports, j as jsxRuntimeExports, d as cn, L as LoadingSpinner, o as DNS_TYPES, S as Shield, C as Cloud, R as RefreshCw, X } from "./index-DwdjykTe.js";
import { T as TypeBadge, P as Pencil, C as ConfirmDialog } from "./ConfirmDialog-DVhQsaID.js";
import { E as EmptyState } from "./EmptyState-B4UvWm3Z.js";
import { G as Globe, T as ToggleRight, a as ToggleLeft } from "./toggle-right-DfMTSMlq.js";
import { P as Plus, T as Trash2 } from "./trash-2-BU5Fb0VQ.js";
import { C as ChevronDown, a as ChevronRight } from "./chevron-right-Cqw8ZylO.js";
import { E as Eye } from "./eye-DTUAvYMY.js";
const __iconNode$4 = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
];
const ArrowRight = createLucideIcon("arrow-right", __iconNode$4);
const __iconNode$3 = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
  ["path", { d: "M18 17V9", key: "2bz60n" }],
  ["path", { d: "M13 17V5", key: "1frdt8" }],
  ["path", { d: "M8 17v-3", key: "17ska0" }]
];
const ChartColumn = createLucideIcon("chart-column", __iconNode$3);
const __iconNode$2 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 6v6l4 2", key: "mmk7yg" }]
];
const Clock = createLucideIcon("clock", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", key: "1cjeqo" }],
  ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", key: "19qd67" }]
];
const Link = createLucideIcon("link", __iconNode$1);
const __iconNode = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode);
function DnsFormModal({ type = "create", record, zoneId, onSave, onClose }) {
  const [form, setForm] = reactExports.useState(record ?? { type: "A", name: "", content: "", ttl: 3600, proxied: false });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-border-base", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-text-primary", children: type === "create" ? "Add DNS Record" : "Edit DNS Record" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-text-muted hover:text-text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: (e) => {
        e.preventDefault();
        onSave(zoneId, form);
        onClose();
      }, className: "p-5 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: "Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: form.type,
              onChange: (e) => setForm((f) => ({ ...f, type: e.target.value })),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none",
              children: Object.keys(DNS_TYPES).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t }, t))
            }
          )
        ] }),
        [["name", "Name", "@ or subdomain"], ["content", "Value / Content", "192.0.2.1"]].map(([k, l, p]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: form[k] ?? "",
              placeholder: p,
              onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
            }
          )
        ] }, k)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: form.proxied,
              onChange: (e) => setForm((f) => ({ ...f, proxied: e.target.checked })),
              className: "w-4 h-4 accent-[#f6821f]"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-text-muted", children: "Proxied through Cloudflare" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md", children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "px-4 py-1.5 text-sm text-white rounded-md font-medium", style: { background: "#f6821f" }, children: type === "create" ? "Add Record" : "Save Changes" })
        ] })
      ] })
    ] })
  ] });
}
function ZoneTree({ accounts, selectedAccountId, selectedZoneId, onSelectAccount, onSelectZone, onExpandAccount }) {
  const [expanded, setExpanded] = reactExports.useState({});
  const handleToggle = reactExports.useCallback(async (accId) => {
    const isNowExpanding = !expanded[accId];
    setExpanded((ex) => ({ ...ex, [accId]: isNowExpanding }));
    if (isNowExpanding) {
      await onExpandAccount(accId);
    }
  }, [expanded, onExpandAccount]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2.5 border-b border-border-base flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-text-dim", children: "Accounts & Zones" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto py-1", children: [
      accounts.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-10 px-4 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Cloud, { size: 24, className: "text-text-dim mb-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-dim", children: "No Cloudflare accounts." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim mt-1", children: "Add one in Settings." })
      ] }),
      accounts.map((acc) => {
        const isExp = expanded[acc.id] ?? false;
        const isSelAcc = selectedAccountId === acc.id;
        const hasZones = acc.zones != null;
        const isLoading = isExp && !hasZones;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: cn("flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-bg-hover/60", isSelAcc && "bg-bg-hover"),
              onClick: () => {
                onSelectAccount(acc.id);
                if (!isExp) handleToggle(acc.id);
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: (e) => {
                  e.stopPropagation();
                  handleToggle(acc.id);
                }, className: "text-text-dim", children: isExp ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 13 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 13 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Cloud, { size: 14, className: "text-[#f6821f] flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-text-primary truncate", children: acc.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim truncate", children: acc.email })
                ] }),
                hasZones && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-text-dim", children: acc.zones.length })
              ]
            }
          ),
          isExp && (isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 pl-9 pr-3 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 12, color: "#f6821f" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-text-dim", children: "Loading domains…" })
          ] }) : acc.zones?.map((zone) => {
            const isSel = selectedZoneId === zone.id;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: cn(
                  "flex items-center gap-2 pl-9 pr-3 py-2 cursor-pointer transition-colors hover:bg-bg-hover/60",
                  isSel && "bg-bg-hover border-l-2 border-[#f6821f]"
                ),
                onClick: () => onSelectZone(zone.id),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 12, className: isSel ? "text-[#f6821f]" : "text-text-dim", style: { flexShrink: 0 } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-text-primary truncate", children: zone.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-text-dim", children: [
                      zone.plan,
                      " · ",
                      zone.status
                    ] })
                  ] })
                ]
              },
              zone.id
            );
          }))
        ] }, acc.id);
      })
    ] })
  ] });
}
function RightPanel({
  zone,
  zoneDetails,
  zoneAnalytics,
  isDevMode,
  onPurgeCache,
  onToggleDevMode,
  whoisData,
  isLoadingWhois,
  onLookupWhois,
  isLoadingAnalytics
}) {
  if (!zone) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full text-text-dim text-xs", children: "Select a zone to view details" });
  const totalRequests = zoneAnalytics?.totals?.requests?.all ?? 0;
  const cachedRequests = zoneAnalytics?.totals?.requests?.cached ?? 0;
  const threats = zoneAnalytics?.totals?.threats?.all ?? 0;
  const analyticsTs = zoneAnalytics?.timeseries ?? [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-4 p-4 overflow-y-auto h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 14, className: "text-[#f6821f]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold text-text-primary", children: "Domain Info" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Domain", value: zone.name, mono: true }),
        zoneDetails?.plan && /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Plan", value: zoneDetails.plan }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          InfoRow,
          {
            label: "Status",
            value: zone.status,
            valueClass: zone.status === "active" ? "text-green-400" : "text-yellow-400"
          }
        ),
        zoneDetails?.type && /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Type", value: zoneDetails.type }),
        zoneDetails?.nameservers?.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim block mb-1", children: "Nameservers" }),
          zoneDetails.nameservers.map((ns, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-text-muted font-mono text-[10px] truncate", children: ns }, i))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-text-primary", children: "Quick Actions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: onPurgeCache,
          className: "w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 12 }),
            "Purge Cache"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-text-muted", children: "Dev Mode" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onToggleDevMode, className: "transition-colors", children: isDevMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleRight, { size: 24, className: "text-[#f6821f]" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ToggleLeft, { size: 24, className: "text-text-dim" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4 space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 12, className: "text-[#f6821f]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-text-primary", children: "WHOIS" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => onLookupWhois(zone.name, true),
            disabled: isLoadingWhois,
            className: "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border-base text-text-dim hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50",
            children: [
              isLoadingWhois ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 10, color: "#f6821f" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 10 }),
              whoisData ? "Refresh" : "Lookup"
            ]
          }
        )
      ] }),
      whoisData ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 text-xs", children: [
        whoisData.registrar && /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Registrar", value: whoisData.registrar, truncate: true }),
        whoisData.registrantName && /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Registrant", value: whoisData.registrantName, truncate: true }),
        whoisData.createdDate && /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Created", value: new Date(whoisData.createdDate).toLocaleDateString() }),
        whoisData.expiresDate && (() => {
          const days = Math.ceil((new Date(whoisData.expiresDate) - Date.now()) / 864e5);
          const color = days <= 30 ? "text-red-400" : days <= 90 ? "text-yellow-400" : "text-green-400";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Expires", value: new Date(whoisData.expiresDate).toLocaleDateString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim", children: "Remaining" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10, className: color }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("font-mono font-bold", color), children: [
                  days,
                  "d"
                ] })
              ] })
            ] })
          ] });
        })()
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-text-dim italic", children: [
        'Click "',
        isLoadingWhois ? "..." : "Lookup",
        '" to fetch WHOIS data.'
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { size: 12, className: "text-[#f6821f]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-text-primary", children: "Zone Analytics" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-text-dim", children: "Last 24h" })
      ] }),
      isLoadingAnalytics ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 16, color: "#f6821f" }) }) : zoneAnalytics ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MiniStat, { label: "Requests", value: formatMetric(totalRequests), color: "text-text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MiniStat, { label: "Cached", value: formatMetric(cachedRequests), color: "text-green-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MiniStat, { label: "Threats", value: formatMetric(threats), color: "text-red-400" })
        ] }),
        analyticsTs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end gap-px h-10", children: analyticsTs.slice(-24).map((ts, i) => {
          const val = ts.requests?.all ?? 0;
          const max = Math.max(...analyticsTs.slice(-24).map((t) => t.requests?.all ?? 0), 1);
          const h = Math.max(2, val / max * 40);
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "flex-1 rounded-t-sm bg-[#f6821f]/60 hover:bg-[#f6821f] transition-colors",
              style: { height: h },
              title: `${val} requests`
            },
            i
          );
        }) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim italic", children: "No analytics data available." })
    ] })
  ] });
}
function InfoRow({ label, value, mono, truncate, valueClass }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim flex-shrink-0", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-text-primary", mono && "font-mono", truncate && "truncate max-w-[140px]", valueClass), children: value })
  ] });
}
function MiniStat({ label, value, color }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-surface rounded-md px-2 py-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-sm font-bold", color), children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] text-text-dim", children: label })
  ] });
}
function formatMetric(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function formatBytes(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}
function SectionHeader({ title }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold text-text-primary flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { size: 14, className: "text-[#f6821f]" }),
    title
  ] });
}
function OverviewAreaChart({ label, value, data, getValue, getLabel, color = "#3b82f6", formatVal }) {
  if (!data?.length) return null;
  const values = data.map(getValue);
  const max = Math.max(...values, 1);
  const w = 500, h = 60;
  const step = w / Math.max(data.length - 1, 1);
  const points = values.map((v, i) => [i * step, h - v / max * (h - 4)]);
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const areaPath = linePath + ` L${(data.length - 1) * step},${h} L0,${h} Z`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-shrink-0 w-36", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-text-dim uppercase tracking-wider mb-1", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold text-text-primary font-mono", children: value })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: `0 0 ${w} ${h}`, className: "w-full h-16", preserveAspectRatio: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: `grad-${label.replace(/\s/g, "")}`, x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: color, stopOpacity: "0.4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: color, stopOpacity: "0.05" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: areaPath, fill: `url(#grad-${label.replace(/\s/g, "")})` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: linePath, fill: "none", stroke: color, strokeWidth: "1.5" })
    ] }) })
  ] }) });
}
function AnalyticsBarChart({ title, subtitle, data, getValue, getCached, getLabel, color, cachedColor, formatValue }) {
  if (!data?.length) return null;
  const fmt = formatValue ?? formatMetric;
  const maxVal = Math.max(...data.map(getValue), 1);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-text-primary", children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-text-dim", children: subtitle })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end gap-[2px] h-24", children: data.map((d, i) => {
      const total = getValue(d);
      const cached = getCached?.(d) ?? 0;
      const totalH = Math.max(2, total / maxVal * 96);
      const cachedH = total > 0 ? cached / total * totalH : 0;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex-1 flex flex-col justify-end cursor-default group relative",
          style: { height: totalH },
          title: `${getLabel?.(d) ?? i}: ${fmt(total)}${getCached ? ` (cached: ${fmt(cached)})` : ""}`,
          children: [
            getCached && cachedH > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-t-sm transition-colors", style: {
              height: cachedH,
              background: cachedColor + "90"
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transition-colors group-hover:opacity-80", style: {
              height: totalH - cachedH,
              background: color + "90",
              borderRadius: cachedH > 0 ? 0 : "2px 2px 0 0"
            } })
          ]
        },
        i
      );
    }) }),
    data.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between mt-1 text-[9px] text-text-dim", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: getLabel?.(data[0]) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: getLabel?.(data.at(-1)) })
    ] }),
    getCached && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 mt-2 text-[9px] text-text-dim", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-sm", style: { background: color } }),
        " Uncached"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-sm", style: { background: cachedColor } }),
        " Cached"
      ] })
    ] })
  ] });
}
function BreakdownTable({ title, items, nameKey, valueKey, color, getColor }) {
  if (!items?.length) return null;
  const maxVal = Math.max(...items.map((i) => i[valueKey] ?? 0), 1);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-text-primary block mb-3", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: items.map((item, i) => {
      const val = item[valueKey] ?? 0;
      const pct = val / maxVal * 100;
      const barColor = getColor ? getColor(item) : color;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-muted truncate flex-shrink-0", style: { width: "40%" }, children: item[nameKey] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-4 bg-bg-surface rounded-sm overflow-hidden relative", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-sm transition-all", style: { width: `${pct}%`, background: barColor + "70" } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-primary font-mono text-[10px] flex-shrink-0 w-14 text-right", children: formatMetric(val) })
      ] }, i);
    }) })
  ] });
}
function BandwidthStat({ label, bytes, color }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-lg font-bold font-mono", color), children: formatBytes(bytes ?? 0) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim mt-1", children: label })
  ] });
}
function AnalyticsTimeRange({ onRangeChange }) {
  const [active, setActive] = reactExports.useState("24h");
  const ranges = [
    { label: "24 Hours", key: "24h", mins: 1440 },
    { label: "7 Days", key: "7d", mins: 10080 },
    { label: "30 Days", key: "30d", mins: 43200 }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 bg-bg-primary border border-border-base rounded-md p-0.5", children: ranges.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      onClick: () => {
        setActive(r.key);
        onRangeChange(r.mins);
      },
      className: cn(
        "px-2.5 py-1 text-[10px] font-medium rounded transition-colors",
        active === r.key ? "bg-[#f6821f]/20 text-[#f6821f]" : "text-text-dim hover:text-text-primary"
      ),
      children: r.label
    },
    r.key
  )) });
}
function CloudflarePage() {
  const {
    accounts,
    selectedAccountId,
    selectedZoneId,
    dnsRecords,
    tunnels,
    tunnelConfigs,
    activeTab,
    dnsFilter,
    isLoadingDns,
    isLoadingTunnels,
    isDevMode,
    isLoadingWhois,
    zoneDetails,
    zoneSettings,
    zoneAnalytics,
    isLoadingDetails,
    isLoadingAnalytics,
    whoisCache,
    loadAccounts,
    selectAccount,
    selectZone,
    loadZonesForAccount,
    loadDnsRecords,
    loadTunnels,
    setActiveTab,
    setDnsFilter,
    createDnsRecord,
    updateDnsRecord,
    deleteDnsRecord,
    purgeCache,
    toggleDevMode,
    lookupWhois
  } = useCloudflareStore();
  const [dnsModal, setDnsModal] = reactExports.useState(null);
  const [confirmDelete, setConfirmDelete] = reactExports.useState(null);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const selectedZone = selectedAccount?.zones?.find((z) => z.id === selectedZoneId);
  const filteredDns = dnsFilter ? dnsRecords.filter((r) => r.name.toLowerCase().includes(dnsFilter.toLowerCase()) || r.type.toLowerCase().includes(dnsFilter.toLowerCase()) || r.content.toLowerCase().includes(dnsFilter.toLowerCase())) : dnsRecords;
  reactExports.useEffect(() => {
    loadAccounts();
  }, []);
  reactExports.useEffect(() => {
    if (selectedZoneId && selectedAccountId)
      loadDnsRecords({ accountId: selectedAccountId, zoneId: selectedZoneId });
  }, [selectedZoneId, selectedAccountId]);
  const whoisData = selectedZone ? whoisCache[selectedZone.name] : null;
  const TABS = [
    { id: "dns", label: "DNS Records" },
    { id: "tunnels", label: "Tunnels" },
    { id: "settings", label: "Zone Settings" },
    { id: "analytics", label: "Analytics" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col bg-bg-surface border-r border-border-base overflow-hidden", style: { width: 240, minWidth: 180 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ZoneTree,
      {
        accounts,
        selectedAccountId,
        selectedZoneId,
        onSelectAccount: selectAccount,
        onSelectZone: selectZone,
        onExpandAccount: loadZonesForAccount
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "resize-divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col overflow-hidden min-w-0", children: [
      selectedZone && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-4 py-2.5 border-b border-border-base bg-bg-surface/60 flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 16, className: "text-[#f6821f]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-text-primary text-sm", children: selectedZone.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge bg-[#f6821f]/20 text-[#f6821f] border border-[#f6821f]/30 text-[10px]", children: selectedZone.plan })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 px-3 py-2 border-b border-border-base bg-bg-surface/40 flex-shrink-0", children: [
        TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setActiveTab(t.id),
            className: cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              activeTab === t.id ? "bg-[#f6821f]/20 text-[#f6821f]" : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
            ),
            children: t.label
          },
          t.id
        )),
        activeTab === "dns" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 bg-bg-primary border border-border-base rounded-md px-2.5 py-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 12, className: "text-text-dim" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: dnsFilter,
                onChange: (e) => setDnsFilter(e.target.value),
                placeholder: "Filter records…",
                className: "bg-transparent outline-none text-xs text-text-primary placeholder:text-text-dim w-36"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setDnsModal({ type: "create" }),
              className: "flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-md transition-colors",
              style: { background: "#f6821f" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 12 }),
                "Add Record"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto", children: [
        activeTab === "dns" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          isLoadingDns ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 24, color: "#f6821f" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "data-table", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-bg-surface z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Name" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Content/Value" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Proxy Status" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "TTL" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-16", children: "Actions" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredDns.map((r) => {
              const dtype = DNS_TYPES[r.type] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.15)" };
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TypeBadge, { label: r.type, color: dtype.color, bg: dtype.bg }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-sm", children: r.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "font-mono text-xs text-text-muted max-w-xs truncate", children: r.content }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.proxied ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge bg-[#f6821f]/20 text-[#f6821f] border border-[#f6821f]/30 text-[10px]", children: "⛅ proxied" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[10px]", children: "DNS only" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-xs text-text-dim", children: r.ttl === 1 ? "Auto" : r.ttl + "s" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDnsModal({ type: "edit", record: r }), className: "p-1 text-text-dim hover:text-text-primary transition-colors rounded", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { size: 13 }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setConfirmDelete(r.id), className: "p-1 text-text-dim hover:text-red-400 transition-colors rounded", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 13 }) })
                ] }) })
              ] }, r.id);
            }) })
          ] }),
          !filteredDns.length && !isLoadingDns && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-16 text-center text-text-dim text-sm", children: "No DNS records found." })
        ] }),
        activeTab === "tunnels" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 space-y-3", children: isLoadingTunnels ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 24, color: "#f6821f" }) }) : tunnels.length > 0 ? tunnels.map((tunnel) => {
          const config = tunnelConfigs[tunnel.id];
          const ingress = config?.ingress ?? [];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("w-2 h-2 rounded-full", tunnel.status === "healthy" ? "bg-accent-deploy animate-pulse-soft" : "bg-yellow-400") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sm text-text-primary", children: tunnel.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("badge text-xs", tunnel.status === "healthy" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"), children: tunnel.status }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-xs font-mono text-text-dim", children: tunnel.connections?.[0]?.clientVersion ?? "—" })
            ] }),
            tunnel.connections?.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 mb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-text-dim mb-1", children: [
                "Active Connections (",
                tunnel.connections.length,
                ")"
              ] }),
              tunnel.connections.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs bg-bg-surface border border-border-base rounded-md px-3 py-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-text-muted", children: "#?" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-text-primary", children: c.originIp ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-green-400", children: c.coloName ?? "colo-" + c.connIndex }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto font-mono text-text-dim text-[10px]", children: c.clientVersion ?? "" })
              ] }, i))
            ] }),
            ingress.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-text-dim mb-1", children: [
                "Ingress Rules (",
                ingress.filter((r) => r.hostname).length,
                ")"
              ] }),
              ingress.map((rule, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 text-xs bg-bg-surface border border-border-base rounded-md px-3 py-1.5", children: rule.hostname ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 11, className: "text-[#f6821f] flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-text-primary", children: rule.hostname }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 10, className: "text-text-dim flex-shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-blue-400 truncate", children: rule.service })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-text-dim font-mono", children: [
                "Catch-all → ",
                rule.service
              ] }) }, i))
            ] })
          ] }, tunnel.id);
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Link, title: "No tunnels", message: "Create a Cloudflare Tunnel to securely expose local services." }) }),
        activeTab === "settings" && selectedZone && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-3 max-w-lg", children: [
          [
            ["Domain", selectedZone.name],
            ["Plan", selectedZone.plan],
            ["Type", zoneDetails?.type ?? "full"],
            ["Status", selectedZone.status],
            ["Created", zoneDetails?.createdOn ? new Date(zoneDetails.createdOn).toLocaleDateString() : "—"]
          ].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-2 border-b border-border-base/50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-text-muted", children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-text-primary font-mono", children: v })
          ] }, l)),
          zoneDetails?.nameservers?.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-2 border-b border-border-base/50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-text-muted block mb-2", children: "Nameservers" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: zoneDetails.nameservers.map((ns, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-mono text-text-primary bg-bg-primary border border-border-base rounded px-3 py-1.5", children: ns }, i)) })
          ] }),
          zoneSettings && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-2 border-b border-border-base/50", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-text-muted", children: "SSL Mode" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-text-primary", children: zoneSettings.ssl ?? "—" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-2 border-b border-border-base/50", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-text-muted", children: "Min TLS Version" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium text-text-primary", children: zoneSettings.min_tls_version ?? "—" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-2 border-b border-border-base/50", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-text-muted", children: "Development Mode" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-sm font-medium", isDevMode ? "text-yellow-400" : "text-text-primary"), children: isDevMode ? "ON" : "OFF" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "flex items-center gap-2 text-xs px-3 py-2 border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 12 }),
            "View SSL / TLS Settings"
          ] }) })
        ] }),
        activeTab === "analytics" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4", children: isLoadingAnalytics ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 24, color: "#f6821f" }) }) : zoneAnalytics ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-bold text-text-primary", children: "Overview" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim mt-0.5", children: "Monitor how Cloudflare processes traffic for this zone." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AnalyticsTimeRange,
              {
                onRangeChange: (mins) => {
                  const { selectedAccountId: selectedAccountId2, selectedZoneId: selectedZoneId2, accounts: accounts2 } = useCloudflareStore.getState();
                  const account = accounts2.find((a) => a.id === selectedAccountId2);
                  if (account && selectedZoneId2) {
                    useCloudflareStore.getState().fetchZoneAnalytics(account, selectedZoneId2, `-${mins}`);
                  }
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              OverviewAreaChart,
              {
                label: "Unique Visitors",
                value: formatMetric(zoneAnalytics.totals?.uniques?.all ?? 0),
                data: zoneAnalytics.timeseries ?? [],
                getValue: (ts) => ts.uniques?.all ?? 0,
                color: "#3b82f6"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              OverviewAreaChart,
              {
                label: "Total Requests",
                value: formatMetric(zoneAnalytics.totals?.requests?.all ?? 0),
                data: zoneAnalytics.timeseries ?? [],
                getValue: (ts) => ts.requests?.all ?? 0,
                color: "#3b82f6"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              OverviewAreaChart,
              {
                label: "Percent Cached",
                value: zoneAnalytics.totals?.requests?.all > 0 ? (zoneAnalytics.totals.requests.cached / zoneAnalytics.totals.requests.all * 100).toFixed(2) + "%" : "0%",
                data: zoneAnalytics.timeseries ?? [],
                getValue: (ts) => {
                  const all = ts.requests?.all ?? 0;
                  const cached = ts.requests?.cached ?? 0;
                  return all > 0 ? cached / all * 100 : 0;
                },
                color: "#3b82f6"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              OverviewAreaChart,
              {
                label: "Total Data Served",
                value: formatBytes(zoneAnalytics.totals?.bandwidth?.all ?? 0),
                data: zoneAnalytics.timeseries ?? [],
                getValue: (ts) => ts.bandwidth?.all ?? 0,
                color: "#3b82f6"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              OverviewAreaChart,
              {
                label: "Data Cached",
                value: formatBytes(zoneAnalytics.totals?.bandwidth?.cached ?? 0),
                data: zoneAnalytics.timeseries ?? [],
                getValue: (ts) => ts.bandwidth?.cached ?? 0,
                color: "#3b82f6"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border-base pt-4 mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { title: "HTTP Traffic Breakdown" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-6 gap-3", children: [
            ["Total Requests", formatMetric(zoneAnalytics.totals?.requests?.all ?? 0), "text-[#f6821f]"],
            ["Cached", formatMetric(zoneAnalytics.totals?.requests?.cached ?? 0), "text-green-400"],
            ["Uncached", formatMetric(zoneAnalytics.totals?.requests?.uncached ?? 0), "text-yellow-400"],
            ["Unique Visitors", formatMetric(zoneAnalytics.totals?.uniques?.all ?? 0), "text-blue-400"],
            ["Page Views", formatMetric(zoneAnalytics.totals?.pageviews?.all ?? 0), "text-purple-400"],
            ["Threats", formatMetric(zoneAnalytics.totals?.threats?.all ?? 0), "text-red-400"]
          ].map(([label, val, color]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-3 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-lg font-bold", color), children: val }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-text-dim mt-0.5", children: label })
          ] }, label)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            AnalyticsBarChart,
            {
              title: "Requests",
              subtitle: "per day",
              data: zoneAnalytics.timeseries ?? [],
              getValue: (ts) => ts.requests?.all ?? 0,
              getCached: (ts) => ts.requests?.cached ?? 0,
              getLabel: (ts) => ts.since?.slice(5, 10),
              color: "#f6821f",
              cachedColor: "#22c55e"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            AnalyticsBarChart,
            {
              title: "Bandwidth",
              subtitle: "per day",
              data: zoneAnalytics.timeseries ?? [],
              getValue: (ts) => ts.bandwidth?.all ?? 0,
              getCached: (ts) => ts.bandwidth?.cached ?? 0,
              getLabel: (ts) => ts.since?.slice(5, 10),
              color: "#3b82f6",
              cachedColor: "#22c55e",
              formatValue: formatBytes
            }
          ),
          zoneAnalytics.totals?.bandwidth && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { title: "Bandwidth Breakdown" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-4 mt-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(BandwidthStat, { label: "Total", bytes: zoneAnalytics.totals.bandwidth.all, color: "text-blue-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(BandwidthStat, { label: "Cached", bytes: zoneAnalytics.totals.bandwidth.cached, color: "text-green-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(BandwidthStat, { label: "Uncached", bytes: zoneAnalytics.totals.bandwidth.uncached, color: "text-yellow-400" })
            ] }),
            zoneAnalytics.totals.bandwidth.all > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-[10px] text-text-dim mb-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Cache Hit Ratio" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  Math.round(zoneAnalytics.totals.bandwidth.cached / zoneAnalytics.totals.bandwidth.all * 100),
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full h-2 bg-bg-surface rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-green-400 rounded-full", style: { width: `${zoneAnalytics.totals.bandwidth.cached / zoneAnalytics.totals.bandwidth.all * 100}%` } }) })
            ] })
          ] }),
          (zoneAnalytics.totals?.encrypted?.requests ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { title: "Encrypted Traffic (HTTPS)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4 mt-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-bold text-emerald-400 font-mono", children: formatMetric(zoneAnalytics.totals.encrypted.requests) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim mt-1", children: "HTTPS Requests" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-bold text-emerald-400 font-mono", children: formatBytes(zoneAnalytics.totals.encrypted.bytes) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-dim mt-1", children: "HTTPS Bandwidth" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              BreakdownTable,
              {
                title: "Top Countries",
                items: zoneAnalytics.countries ?? [],
                nameKey: "name",
                valueKey: "requests",
                color: "#f6821f"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              BreakdownTable,
              {
                title: "Content Types",
                items: zoneAnalytics.contentTypes ?? [],
                nameKey: "name",
                valueKey: "requests",
                color: "#8b5cf6"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            BreakdownTable,
            {
              title: "HTTP Status Codes",
              items: zoneAnalytics.statusCodes ?? [],
              nameKey: "code",
              valueKey: "requests",
              color: "#3b82f6",
              getColor: (item) => {
                const c = parseInt(item.code);
                if (c >= 500) return "#ef4444";
                if (c >= 400) return "#f59e0b";
                if (c >= 300) return "#3b82f6";
                return "#22c55e";
              }
            }
          ),
          zoneAnalytics.dns && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border-base pt-4 mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { title: "DNS Analytics" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-3 text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-cyan-400", children: formatMetric(zoneAnalytics.dns.totalQueries) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-text-dim", children: "Total DNS Queries" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-3 text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-cyan-400", children: zoneAnalytics.dns.timeseries.length > 0 ? (zoneAnalytics.dns.totalQueries / (zoneAnalytics.dns.timeseries.length * 86400)).toFixed(3) : "0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-text-dim", children: "Avg Queries/sec" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-3 text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-cyan-400", children: zoneAnalytics.dns.byName?.length ?? 0 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-text-dim", children: "Unique Names" })
              ] })
            ] }),
            zoneAnalytics.dns.timeseries?.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-primary border border-border-base rounded-lg p-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-text-primary", children: "DNS Queries" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-text-dim", children: "per day" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end gap-[2px] h-20", children: zoneAnalytics.dns.timeseries.map((d, i) => {
                const max = Math.max(...zoneAnalytics.dns.timeseries.map((t) => t.queries), 1);
                const h = Math.max(2, d.queries / max * 80);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "flex-1 rounded-t-sm bg-cyan-500/60 hover:bg-cyan-400 transition-colors cursor-default",
                    style: { height: h },
                    title: `${d.date}: ${d.queries.toLocaleString()} queries`
                  },
                  i
                );
              }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between mt-1 text-[9px] text-text-dim", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: zoneAnalytics.dns.timeseries[0]?.date?.slice(5) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: zoneAnalytics.dns.timeseries.at(-1)?.date?.slice(5) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(BreakdownTable, { title: "Query Names", items: zoneAnalytics.dns.byName ?? [], nameKey: "name", valueKey: "queries", color: "#06b6d4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(BreakdownTable, { title: "Query Types", items: zoneAnalytics.dns.byType ?? [], nameKey: "type", valueKey: "queries", color: "#14b8a6" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              BreakdownTable,
              {
                title: "DNS Response Codes",
                items: zoneAnalytics.dns.byResponseCode ?? [],
                nameKey: "code",
                valueKey: "queries",
                color: "#06b6d4",
                getColor: (item) => item.code === "NOERROR" ? "#22c55e" : item.code === "NXDOMAIN" ? "#f59e0b" : "#ef4444"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: ChartColumn, title: "No analytics", message: "Analytics data is not available for this zone." }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "resize-divider" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col bg-bg-surface border-l border-border-base overflow-hidden", style: { width: 260, minWidth: 200 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      RightPanel,
      {
        zone: selectedZone,
        zoneDetails,
        zoneAnalytics,
        isDevMode,
        onPurgeCache: purgeCache,
        onToggleDevMode: toggleDevMode,
        whoisData,
        isLoadingWhois,
        onLookupWhois: lookupWhois,
        isLoadingAnalytics
      }
    ) }),
    dnsModal && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DnsFormModal,
      {
        type: dnsModal.type,
        record: dnsModal.record,
        zoneId: selectedZoneId,
        onSave: async (zid, r) => {
          dnsModal.type === "create" ? await createDnsRecord(r) : await updateDnsRecord(r.id, r);
        },
        onClose: () => setDnsModal(null)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        isOpen: !!confirmDelete,
        title: "Delete DNS Record",
        message: "This will permanently delete this DNS record.",
        confirmLabel: "Delete",
        onConfirm: async () => {
          await deleteDnsRecord(confirmDelete);
          setConfirmDelete(null);
        },
        onCancel: () => setConfirmDelete(null)
      }
    )
  ] });
}
export {
  CloudflarePage as default
};
