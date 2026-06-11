import { useEffect, useRef } from 'react'
import Choices from 'choices.js'

export interface SelectOption {
  value: string
  label: string
  customLabel?: string  // raw HTML rendered by Choices when allowHTML is true
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  id?: string
  icon?: React.ReactNode
  allowHTML?: boolean
}

export default function Select({ value, onChange, options, className, id, icon, allowHTML }: Props) {
  const ref = useRef<HTMLSelectElement>(null)
  const choicesRef = useRef<Choices | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const c = new Choices(ref.current, {
      searchEnabled: false,
      itemSelectText: '',
      shouldSort: false,
      allowHTML: allowHTML ?? false,
    })
    choicesRef.current = c

    // If icon, push the inner label right so it doesn't overlap the icon
    if (icon) {
      const inner = ref.current.closest('.choices')?.querySelector('.choices__inner') as HTMLElement | null
      if (inner) inner.style.paddingLeft = '26px'
    }

    // Lock width to the widest option label so it never jumps on selection
    if (containerRef.current) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.font = '500 13px Inter, -apple-system, sans-serif'
        const maxW = Math.max(...options.map(o => ctx.measureText(o.label).width))
        const iconPad = icon ? 20 : 0
        containerRef.current.style.minWidth = `${Math.ceil(10 + iconPad + maxW + 32)}px`
      }
    }

    return () => { c.destroy(); choicesRef.current = null }
  }, [])

  useEffect(() => {
    choicesRef.current?.setChoiceByValue(value)
  }, [value])

  return (
    <div ref={containerRef} className="relative inline-block">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 z-10 flex -translate-y-1/2 items-center text-dim">
          {icon}
        </span>
      )}
      <select
        ref={ref}
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} label={o.customLabel ?? o.label}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
