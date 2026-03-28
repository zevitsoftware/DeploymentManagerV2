import { c as createLucideIcon, p as useAuthStore, j as jsxRuntimeExports, r as reactExports, L as LoadingSpinner, A as AI_MODES, d as cn, q as AI_MODELS, t as toast } from "./index-DwdjykTe.js";
import { C as CircleCheck, B as Bot } from "./circle-check-2WPuBY6N.js";
import { C as CircleAlert } from "./circle-alert-BNbWJ8zM.js";
import { P as Plus, T as Trash2 } from "./trash-2-BU5Fb0VQ.js";
import { T as TestTube } from "./test-tube-WBwhMlxn.js";
import { C as ChevronDown, a as ChevronRight } from "./chevron-right-Cqw8ZylO.js";
import { E as EyeOff } from "./eye-off-yGLETOZI.js";
import { E as Eye } from "./eye-DTUAvYMY.js";
const __iconNode = [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
];
const User = createLucideIcon("user", __iconNode);
function SectionHeader({ icon: Icon, label, open, onToggle }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick: onToggle,
      className: "w-full flex items-center gap-3 px-0 py-3 border-b border-border-base group",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-7 h-7 rounded-lg bg-bg-hover flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: 15, className: "text-text-muted" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-sm font-semibold text-text-primary text-left", children: label }),
        open ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 15, className: "text-text-dim" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 15, className: "text-text-dim" })
      ]
    }
  );
}
function GcpAuthSection({ user, onLogin, onLogout, isLoading }) {
  const [open, setOpen] = reactExports.useState(true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { icon: User, label: "GCP Authentication", open, onToggle: () => setOpen((o) => !o) }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-4 space-y-3", children: user ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 p-4 rounded-lg border border-green-500/30 bg-green-500/10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 18, className: "text-green-400 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-text-primary", children: "Authenticated" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-muted mt-0.5", children: user.email }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-mono text-text-dim mt-0.5", children: user.account })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onLogout,
          className: "text-xs px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-md transition-colors",
          children: "Sign Out"
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-lg border border-border-base bg-bg-primary text-center space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 32, className: "text-text-dim mx-auto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-text-muted", children: "Not authenticated. Sign in with Google Cloud to manage GCP firewalls." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onLogin,
          disabled: isLoading,
          className: "flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-60",
          children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 13, color: "white" }),
            "Authenticating…"
          ] }) : "Sign in with Google"
        }
      )
    ] }) })
  ] });
}
function ApiKeyInput({ value, label, placeholder, onChange, onDelete }) {
  const [show, setShow] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex items-center gap-0 bg-bg-primary border border-border-base rounded-md overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: show ? "text" : "password",
          value,
          placeholder,
          onChange: (e) => onChange(e.target.value),
          className: "flex-1 bg-transparent px-3 py-2 text-xs font-mono text-text-primary focus:outline-none placeholder:text-text-dim"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShow((s) => !s), className: "px-2 text-text-dim hover:text-text-muted transition-colors", children: show ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { size: 13 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { size: 13 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onDelete, className: "p-2 text-text-dim hover:text-red-400 transition-colors rounded", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 13 }) })
  ] });
}
function AiConfigSection({ aiConfig, onSave, onTest }) {
  const [open, setOpen] = reactExports.useState(true);
  const [form, setForm] = reactExports.useState(aiConfig);
  const [isTesting, setIsTesting] = reactExports.useState(false);
  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onSave(form);
      const res = await onTest();
      if (res?.ok) toast.success(`AI OK — ${res.provider ?? ""}: ${(res.analysis ?? "").slice(0, 80)}`);
      else toast.error(`AI test failed: ${res?.error ?? "Unknown error"}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsTesting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { icon: Bot, label: "AI Configuration", open, onToggle: () => setOpen((o) => !o) }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-4 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-2", children: "AI Provider Mode" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2", children: [{ id: AI_MODES.GEMINI_CLI, label: "Gemini CLI (Recommended)" }, { id: AI_MODES.API_KEYS, label: "API Keys" }].map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setForm((f) => ({ ...f, mode: opt.id })),
            className: cn("flex-1 py-2 text-xs font-medium rounded-lg border transition-colors", form.mode === opt.id ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "border-border-base text-text-muted hover:bg-bg-hover"),
            children: opt.label
          },
          opt.id
        )) })
      ] }),
      form.mode === AI_MODES.GEMINI_CLI && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          form.cliReady ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"
        ), children: [
          form.cliReady ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 16, className: "text-green-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 16, className: "text-yellow-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-text-primary", children: form.cliReady ? "Gemini CLI ready" : "Gemini CLI not detected" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-muted mt-0.5", children: form.cliReady ? "Using CloudCode API via `gemini` CLI" : "Install: npm install -g @google/gemini-cli" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-muted mb-1.5", children: "Model" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: form.model,
              onChange: (e) => setForm((f) => ({ ...f, model: e.target.value })),
              className: "w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none",
              children: AI_MODELS.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m }, m))
            }
          )
        ] })
      ] }),
      form.mode === AI_MODES.API_KEYS && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-text-muted", children: "Groq API Keys" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setForm((f) => ({ ...f, groqKeys: [...f.groqKeys, ""] })), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 13, className: "text-text-dim hover:text-text-muted" }) })
          ] }),
          form.groqKeys.map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            ApiKeyInput,
            {
              value: k,
              label: `Groq #${i + 1}`,
              placeholder: "gsk_…",
              onChange: (v) => setForm((f) => ({ ...f, groqKeys: f.groqKeys.map((x, j) => j === i ? v : x) })),
              onDelete: () => setForm((f) => ({ ...f, groqKeys: f.groqKeys.filter((_, j) => j !== i) }))
            },
            i
          )),
          !form.groqKeys.length && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-dim", children: "No Groq keys added. Click + to add." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-text-muted", children: "Gemini API Keys" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setForm((f) => ({ ...f, geminiKeys: [...f.geminiKeys, ""] })), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 13, className: "text-text-dim hover:text-text-muted" }) })
          ] }),
          form.geminiKeys.map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            ApiKeyInput,
            {
              value: k,
              label: `Gemini #${i + 1}`,
              placeholder: "AIza…",
              onChange: (v) => setForm((f) => ({ ...f, geminiKeys: f.geminiKeys.map((x, j) => j === i ? v : x) })),
              onDelete: () => setForm((f) => ({ ...f, geminiKeys: f.geminiKeys.filter((_, j) => j !== i) }))
            },
            i
          )),
          !form.geminiKeys.length && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-dim", children: "No Gemini keys added. Click + to add." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleTest,
            disabled: isTesting,
            className: "flex items-center gap-2 px-3 py-2 text-xs border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-60",
            children: isTesting ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSpinner, { size: 12, color: "#94a3b8" }),
              "Testing…"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TestTube, { size: 13 }),
              "Test Connection"
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => onSave(form),
            className: "flex items-center gap-2 px-4 py-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors",
            children: "Save Config"
          }
        )
      ] })
    ] })
  ] });
}
function SettingsPage() {
  const { user, isLoading, aiConfig, login, logout, saveAiConfig, testAi } = useAuthStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl mx-auto p-6 space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-lg font-bold text-text-primary", children: "Settings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-text-muted mt-0.5", children: "Manage authentication, AI configuration, and application preferences." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-surface border border-border-base rounded-xl p-6 space-y-0 divide-y divide-border-base/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(GcpAuthSection, { user, onLogin: login, onLogout: logout, isLoading }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AiConfigSection, { aiConfig, onSave: saveAiConfig, onTest: testAi }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-bg-surface border border-border-base rounded-xl p-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-text-primary", children: "Zevitsoft Deployment Manager" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-muted mt-0.5", children: "v2.0.0-alpha · Electron · Vite · React" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-text-dim font-mono px-3 py-1.5 bg-bg-primary border border-border-base rounded-lg", children: "Build: 2026.03.13" })
    ] })
  ] }) });
}
export {
  SettingsPage as default
};
