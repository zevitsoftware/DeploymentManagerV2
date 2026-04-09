import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

// xterm.js CSS — injected once
let xtermCssInjected = false
function injectXtermCss() {
  if (xtermCssInjected) return
  xtermCssInjected = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  // xterm CSS bundled via npm — we inline the critical styles here
  const style = document.createElement('style')
  style.textContent = `
    .xterm { padding: 0; height: 100%; }
    .xterm .xterm-viewport { background: transparent !important; overflow-y: scroll !important; }
    .xterm-viewport::-webkit-scrollbar { width: 6px; }
    .xterm-viewport::-webkit-scrollbar-thumb { background: #3a3a5c; border-radius: 3px; }
    .xterm-screen canvas { display: block; }
  `
  document.head.appendChild(style)
}

/**
 * XTerminal — real xterm.js terminal component
 *
 * Props:
 *   className   - wrapper class
 *   style       - wrapper style
 *   onReady     - (terminal) => void, called once terminal is mounted
 *   onData      - (data: string) => void, called on user keystrokes (for SSH input)
 *   onResize    - ({ cols, rows }) => void, called on terminal resize (for SSH resize)
 *
 * Ref methods (imperative API):
 *   write(data)   — write raw text/ANSI to terminal
 *   writeln(data) — write line
 *   clear()       — clear terminal
 *   fit()         — re-fit to container
 *   focus()       — focus terminal
 *   getDimensions() — { cols, rows }
 *
 * Usage:
 *   const termRef = useRef()
 *   <XTerminal ref={termRef} onData={data => ssh.write(data)} />
 *   termRef.current.writeln('$ Hello world')
 */
const XTerminal = forwardRef(function XTerminal({ className = '', style = {}, onReady, onData, onResize }, ref) {
  const containerRef = useRef(null)
  const termRef      = useRef(null)
  const fitAddonRef  = useRef(null)

  // Keep refs to callbacks stable
  const onDataRef   = useRef(onData)
  const onResizeRef = useRef(onResize)
  useEffect(() => { onDataRef.current   = onData   })
  useEffect(() => { onResizeRef.current = onResize })

  useImperativeHandle(ref, () => ({
    write:         (data)  => termRef.current?.write(data),
    writeln:       (data)  => termRef.current?.writeln(data),
    clear:         ()      => termRef.current?.clear(),
    fit:           ()      => fitAddonRef.current?.fit(),
    focus:         ()      => termRef.current?.focus(),
    terminal:      ()      => termRef.current,
    getDimensions: ()      => ({ cols: termRef.current?.cols ?? 80, rows: termRef.current?.rows ?? 24 }),
  }))

  useEffect(() => {
    injectXtermCss()

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 12,
      lineHeight: 1.5,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      convertEol: true,
      theme: {
        background:      '#0d0d1a',
        foreground:      '#e2e8f0',
        black:           '#1a1a2e',
        red:             '#ef4444',
        green:           '#22c55e',
        yellow:          '#eab308',
        blue:            '#3b82f6',
        magenta:         '#a855f7',
        cyan:            '#06b6d4',
        white:           '#e2e8f0',
        brightBlack:     '#64748b',
        brightRed:       '#f87171',
        brightGreen:     '#4ade80',
        brightYellow:    '#fde047',
        brightBlue:      '#60a5fa',
        brightMagenta:   '#c084fc',
        brightCyan:      '#22d3ee',
        brightWhite:     '#f8fafc',
        cursor:          '#22c55e',
        cursorAccent:    '#0d0d1a',
        selectionBackground: 'rgba(99,102,241,0.3)',
      },
      allowProposedApi: true,
    })

    const fitAddon  = new FitAddon()
    const linksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)
    term.open(containerRef.current)

    // Small delay to let container render before fitting
    requestAnimationFrame(() => {
      fitAddon.fit()
      term.writeln('\x1b[2m$ Terminal ready. Connect to a server to start an interactive session.\x1b[0m')
      term.focus()
    })

    termRef.current    = term
    fitAddonRef.current = fitAddon

    onReady?.(term)

    // Handle Ctrl+C (copy) and Ctrl+V (paste) native bindings
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown' && e.ctrlKey) {
        if (e.code === 'KeyC' && term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection())
          term.clearSelection()
          return false
        }
        if (e.code === 'KeyV') {
          // Returning false stops xterm from processing Ctrl+V as \x16 (SYN character).
          // This allows the browser to emit a native `paste` event which xterm handles correctly.
          return false
        }
      }
      return true
    })

    // Wire user keystrokes → callback (for SSH input)
    const dataDisposable = term.onData((data) => {
      onDataRef.current?.(data)
    })

    // Wire terminal resize → callback (for SSH pty resize)
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      onResizeRef.current?.({ cols, rows })
    })

    // Re-fit on container resize
    const ro = new ResizeObserver(() => {
      try { fitAddon.fit() } catch (_) { /* ignore */ }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      dataDisposable?.dispose()
      resizeDisposable?.dispose()
      term.dispose()
      termRef.current    = null
      fitAddonRef.current = null
    }
  }, []) // mount-once

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ background: '#0d0d1a', overflow: 'hidden', ...style }}
    />
  )
})

export default XTerminal
