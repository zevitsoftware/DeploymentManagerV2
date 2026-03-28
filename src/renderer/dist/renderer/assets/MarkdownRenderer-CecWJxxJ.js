import { c as createLucideIcon, j as jsxRuntimeExports, d as cn } from "./index-DwdjykTe.js";
const __iconNode$3 = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]];
const Check = createLucideIcon("check", __iconNode$3);
const __iconNode$2 = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
];
const Copy = createLucideIcon("copy", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      key: "usdka0"
    }
  ]
];
const FolderOpen = createLucideIcon("folder-open", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
      key: "10ikf1"
    }
  ]
];
const Play = createLucideIcon("play", __iconNode);
function MarkdownRenderer({ content = "", className }) {
  if (!content) return null;
  const lines = content.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      line.trim().slice(3).trim() || "text";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "my-2 p-3 rounded-lg bg-black/40 border border-border-base overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-xs text-green-400 leading-relaxed whitespace-pre", children: codeLines.join("\n") }) }, i)
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-bold text-text-primary mt-3 mb-1.5 flex items-center gap-2", children: renderInline(line.slice(3)) }, i)
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold text-text-primary mt-2 mb-1 uppercase tracking-wide", children: renderInline(line.slice(4)) }, i)
      );
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-1.5 pl-3 border-l-2 border-yellow-500/60 text-xs text-yellow-400/90 italic", children: renderInline(line.slice(2)) }, i)
      );
      i++;
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 text-xs text-text-muted my-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-text-dim flex-shrink-0 w-4", children: [
            match[1],
            "."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: renderInline(match[2]) })
        ] }, i)
      );
      i++;
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 text-xs text-text-muted my-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-dim flex-shrink-0", children: "•" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: renderInline(line.slice(2)) })
        ] }, i)
      );
      i++;
      continue;
    }
    if (line.trim() === "---") {
      elements.push(/* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-3 border-border-base" }, i));
      i++;
      continue;
    }
    if (line.trim() === "") {
      elements.push(/* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5" }, i));
      i++;
      continue;
    }
    elements.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-text-muted leading-relaxed", children: renderInline(line) }, i)
    );
    i++;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("space-y-0.5", className), children: elements });
}
function renderInline(text) {
  if (!text) return null;
  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const firstBold = boldMatch ? boldMatch.index : Infinity;
    const firstCode = codeMatch ? codeMatch.index : Infinity;
    if (firstBold === Infinity && firstCode === Infinity) {
      parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: remaining }, key++));
      break;
    }
    if (firstBold < firstCode) {
      if (boldMatch.index > 0) parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: remaining.slice(0, boldMatch.index) }, key++));
      parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "font-semibold text-text-primary", children: boldMatch[1] }, key++));
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      if (codeMatch.index > 0) parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: remaining.slice(0, codeMatch.index) }, key++));
      parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-green-400 bg-black/30 px-1 rounded text-[11px]", children: codeMatch[1] }, key++));
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
    }
  }
  return parts;
}
export {
  Check as C,
  FolderOpen as F,
  MarkdownRenderer as M,
  Play as P,
  Copy as a
};
