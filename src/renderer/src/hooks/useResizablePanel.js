import { useCallback, useRef, useState } from 'react'

/**
 * useResizablePanel — drag-to-resize hook
 *
 * @param {object} options
 * @param {number} options.initial     Initial size in px
 * @param {number} options.min         Minimum size in px (default 100)
 * @param {number} options.max         Maximum size in px (default 800)
 * @param {'horizontal'|'vertical'} options.direction  Which axis to resize on
 * @param {'start'|'end'} options.side Whether the panel is on the start or end of the divider
 *
 * @returns {{ size, isDragging, dividerProps }}
 */
export function useResizablePanel({
  initial = 240,
  min = 100,
  max = 800,
  direction = 'horizontal',
  side = 'start',
}) {
  const [size, setSize] = useState(initial)
  const [isDragging, setIsDragging] = useState(false)
  const startPos = useRef(0)
  const startSize = useRef(initial)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
    startSize.current = size

    const onMouseMove = (me) => {
      const current = direction === 'horizontal' ? me.clientX : me.clientY
      const delta   = current - startPos.current
      const next    = side === 'start'
        ? startSize.current + delta
        : startSize.current - delta
      setSize(Math.min(max, Math.max(min, next)))
    }

    const onMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [size, direction, side, min, max])

  const dividerProps = {
    onMouseDown,
    className: [
      direction === 'horizontal' ? 'resize-divider' : 'resize-divider-h',
      isDragging ? 'dragging' : '',
    ].join(' '),
    style: { cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize' },
  }

  return { size, isDragging, dividerProps }
}

export default useResizablePanel
