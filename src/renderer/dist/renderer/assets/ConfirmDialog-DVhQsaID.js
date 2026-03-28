import { c as createLucideIcon, j as jsxRuntimeExports, d as cn, r as reactExports, T as TriangleAlert } from "./index-DwdjykTe.js";
const __iconNode = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
];
const Pencil = createLucideIcon("pencil", __iconNode);
const VARIANTS = {
  online: "bg-green-500/20 text-green-400 border border-green-500/30",
  offline: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  error: "bg-red-500/20 text-red-400 border border-red-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  running: "bg-green-500/20 text-green-400 border border-green-500/30",
  stopped: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  connected: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
  disconnected: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  healthy: "bg-green-500/20 text-green-400 border border-green-500/30",
  degraded: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  active: "bg-green-500/20 text-green-400 border border-green-500/30",
  ok: "bg-green-500/20 text-green-400 border border-green-500/30",
  idle: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  outdated: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
};
const DOTS = {
  online: "bg-green-400",
  offline: "bg-slate-500",
  error: "bg-red-400",
  running: "bg-green-400",
  stopped: "bg-slate-500",
  healthy: "bg-green-400",
  degraded: "bg-yellow-400",
  pending: "bg-yellow-400",
  connected: "bg-indigo-400",
  disconnected: "bg-slate-500",
  active: "bg-green-400",
  ok: "bg-green-400",
  idle: "bg-slate-500",
  outdated: "bg-yellow-400"
};
function StatusBadge({ status = "offline", label, dot = true, className }) {
  const variant = VARIANTS[status] ?? "bg-slate-500/20 text-slate-400 border border-slate-500/30";
  const dotColor = DOTS[status] ?? "bg-slate-500";
  const text = label ?? status;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("badge", variant, className), children: [
    dot && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          dotColor,
          (status === "online" || status === "running" || status === "connected" || status === "healthy") && "animate-pulse-soft"
        )
      }
    ),
    text
  ] });
}
function TypeBadge({ label, color, bg, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn("badge", className),
      style: { background: bg, color, border: `1px solid ${color}33` },
      children: label
    }
  );
}
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  onConfirm,
  onCancel
}) {
  const [loading, setLoading] = reactExports.useState(false);
  if (!isOpen) return null;
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in",
        onClick: onCancel
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg p-6 w-full max-w-sm mx-4 animate-slide-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          variant === "danger" ? "bg-red-500/20" : "bg-indigo-500/20"
        ), children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 18, className: variant === "danger" ? "text-red-400" : "text-indigo-400" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-text-primary text-base leading-tight", children: title }),
          message && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-text-muted text-sm mt-1 leading-relaxed", children: message })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onCancel,
            disabled: loading,
            className: "px-4 py-1.5 text-sm rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors",
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleConfirm,
            disabled: loading,
            className: cn(
              "px-4 py-1.5 text-sm rounded-md font-medium transition-all",
              variant === "danger" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white",
              loading && "opacity-60 cursor-not-allowed"
            ),
            children: loading ? "Please wait…" : confirmLabel
          }
        )
      ] })
    ] })
  ] });
}
export {
  ConfirmDialog as C,
  Pencil as P,
  StatusBadge as S,
  TypeBadge as T
};
