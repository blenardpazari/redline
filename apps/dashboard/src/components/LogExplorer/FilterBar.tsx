import { IconSearch } from '../ui/icons'

export interface Filters {
  q: string
  threatLevel: string
  status: string
  from: string
  to: string
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

const LEVELS = ['normal', 'suspicious', 'warning', 'critical']
const STATUSES = ['2xx', '3xx', '4xx', '5xx']

const inputCls =
  'h-9 rounded-md border border-border bg-surface px-3 text-[13px] text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent'

export default function FilterBar({ filters, onChange }: Props) {
  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  function clear() {
    onChange({ q: '', threatLevel: '', status: '', from: '', to: '' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex min-w-56 flex-1 items-center">
        <IconSearch size={14} className="pointer-events-none absolute left-3 text-dim" />
        <input
          className={`${inputCls} w-full pl-8`}
          placeholder="Search IP or path…"
          value={filters.q}
          onChange={(e) => set('q', e.target.value)}
        />
      </div>
      <select className={inputCls} value={filters.threatLevel} onChange={(e) => set('threatLevel', e.target.value)}>
        <option value="">All levels</option>
        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <select className={inputCls} value={filters.status} onChange={(e) => set('status', e.target.value)}>
        <option value="">All status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input className={inputCls} type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
      <span className="text-dim">→</span>
      <input className={inputCls} type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
      <button
        className="h-9 rounded-md border border-border bg-surface px-3 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
        onClick={clear}
      >
        Clear
      </button>
    </div>
  )
}
