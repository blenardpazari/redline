interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}

export default function Checkbox({ checked, onChange, label, className }: Props) {
  return (
    <label className={`group flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted transition-colors hover:text-fg ${className ?? ''}`}>
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span className={`flex h-4 w-4 items-center justify-center rounded border transition-all duration-150
          ${checked
            ? 'border-accent bg-accent'
            : 'border-border bg-surface peer-hover:border-border-strong'
          }`}
        >
          {checked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>
      {label}
    </label>
  )
}
