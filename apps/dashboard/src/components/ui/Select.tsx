import { useEffect, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
  customLabel?: string
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

export default function Select({ value, onChange, options, id, icon, allowHTML }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div ref={containerRef} className="choices relative inline-block" id={id}>
      {/* Trigger */}
      <div
        className="choices__inner flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-fg transition-colors hover:border-border-strong"
        style={icon ? { paddingLeft: '26px' } : undefined}
        onClick={() => setOpen(o => !o)}
      >
        {icon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dim">
            {icon}
          </span>
        )}
        {allowHTML && selected?.customLabel
          ? <span className="flex-1 truncate" dangerouslySetInnerHTML={{ __html: selected.customLabel }} />
          : <span className="flex-1 truncate">{selected?.label ?? ''}</span>
        }
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-dim transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="choices__list choices__list--dropdown is-active absolute left-0 top-full z-[200] mt-1 min-w-full rounded-lg border border-border bg-surface shadow-lg">
          {options.map(o => (
            <div
              key={o.value}
              className={`choices__item choices__item--selectable cursor-pointer px-3 py-2 text-[13px] transition-colors hover:bg-surface-2 ${o.value === value ? 'font-medium text-accent' : 'text-fg'}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {allowHTML && o.customLabel
                ? <span dangerouslySetInnerHTML={{ __html: o.customLabel }} />
                : o.label
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
