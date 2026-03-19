import { cn } from '../../lib/utils'

/**
 * MarkdownRenderer — lightweight markdown to JSX renderer
 * Supports: ## headings, **bold**, `code`, ```code blocks```, > blockquote, - lists, blank lines
 *
 * Used for: AI analysis results, deploy logs, chat messages
 */
export function MarkdownRenderer({ content = '', className }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'text'
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="my-2 p-3 rounded-lg bg-black/40 border border-border-base overflow-x-auto">
          <code className="font-mono text-xs text-green-400 leading-relaxed whitespace-pre">
            {codeLines.join('\n')}
          </code>
        </pre>
      )
      i++
      continue
    }

    // H2 ##
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-text-primary mt-3 mb-1.5 flex items-center gap-2">
          {renderInline(line.slice(3))}
        </h2>
      )
      i++; continue
    }

    // H3 ###
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xs font-semibold text-text-primary mt-2 mb-1 uppercase tracking-wide">
          {renderInline(line.slice(4))}
        </h3>
      )
      i++; continue
    }

    // Blockquote >
    if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="my-1.5 pl-3 border-l-2 border-yellow-500/60 text-xs text-yellow-400/90 italic">
          {renderInline(line.slice(2))}
        </div>
      )
      i++; continue
    }

    // Ordered list item 1.
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-text-muted my-0.5">
          <span className="font-mono text-text-dim flex-shrink-0 w-4">{match[1]}.</span>
          <span>{renderInline(match[2])}</span>
        </div>
      )
      i++; continue
    }

    // Unordered list -
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-text-muted my-0.5">
          <span className="text-text-dim flex-shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
      i++; continue
    }

    // Horizontal rule ---
    if (line.trim() === '---') {
      elements.push(<hr key={i} className="my-3 border-border-base" />)
      i++; continue
    }

    // Blank line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
      i++; continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-xs text-text-muted leading-relaxed">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return (
    <div className={cn('space-y-0.5', className)}>
      {elements}
    </div>
  )
}

/**
 * Render inline markdown: **bold**, `code`, plain text
 */
function renderInline(text) {
  if (!text) return null
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // `code`
    const codeMatch = remaining.match(/`([^`]+)`/)
    // ✅ ❌ emoji-based status — just let them render naturally

    const firstBold = boldMatch ? boldMatch.index : Infinity
    const firstCode = codeMatch ? codeMatch.index : Infinity

    if (firstBold === Infinity && firstCode === Infinity) {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    if (firstBold < firstCode) {
      if (boldMatch.index > 0) parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>)
      parts.push(<strong key={key++} className="font-semibold text-text-primary">{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
    } else {
      if (codeMatch.index > 0) parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>)
      parts.push(<code key={key++} className="font-mono text-green-400 bg-black/30 px-1 rounded text-[11px]">{codeMatch[1]}</code>)
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length)
    }
  }

  return parts
}

export default MarkdownRenderer
