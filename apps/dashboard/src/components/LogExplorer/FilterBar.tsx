import { IconSearch } from '../ui/icons'
import Select from '../ui/Select'
import DatePicker from '../ui/DatePicker'

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

const LEVEL_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'normal', label: 'normal' },
  { value: 'suspicious', label: 'suspicious' },
  { value: 'warning', label: 'warning' },
  { value: 'critical', label: 'critical' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: '2xx', label: '2xx' },
  { value: '3xx', label: '3xx' },
  { value: '4xx', label: '4xx' },
  { value: '5xx', label: '5xx' },
]

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
      <Select
        className={inputCls}
        value={filters.threatLevel}
        onChange={(v) => set('threatLevel', v)}
        options={LEVEL_OPTIONS}
      />
      <Select
        className={inputCls}
        value={filters.status}
        onChange={(v) => set('status', v)}
        options={STATUS_OPTIONS}
      />
      <DatePicker className={inputCls} value={filters.from} onChange={(v) => set('from', v)} placeholder="From date" />
      <span className="text-dim">→</span>
      <DatePicker className={inputCls} value={filters.to} onChange={(v) => set('to', v)} placeholder="To date" />
      <button
        className="h-9 rounded-md border border-border bg-surface px-3 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
        onClick={clear}
      >
        Clear
      </button>
    </div>
  )
}
