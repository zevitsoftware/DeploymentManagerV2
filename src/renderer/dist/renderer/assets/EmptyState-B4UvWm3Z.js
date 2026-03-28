import { j as jsxRuntimeExports, d as cn } from "./index-DwdjykTe.js";
function EmptyState({ icon: Icon, title, message, action, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn(
    "flex flex-col items-center justify-center gap-3 p-8 text-center",
    className
  ), children: [
    Icon && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 rounded-xl bg-bg-hover flex items-center justify-center mb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 24, className: "text-text-dim" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-text-muted", children: title }),
      message && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-dim mt-1 max-w-[200px]", children: message })
    ] }),
    action
  ] });
}
export {
  EmptyState as E
};
