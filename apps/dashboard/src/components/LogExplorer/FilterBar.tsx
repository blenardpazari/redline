import styles from './FilterBar.module.css'

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

const LEVELS = ['', 'normal', 'suspicious', 'warning', 'critical']
const STATUSES = ['', '2xx', '3xx', '4xx', '5xx']

export default function FilterBar({ filters, onChange }: Props) {
  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  function clear() {
    onChange({ q: '', threatLevel: '', status: '', from: '', to: '' })
  }

  return (
    <div className={styles.bar}>
      <input
        className={styles.search}
        placeholder="Search IP or path…"
        value={filters.q}
        onChange={(e) => set('q', e.target.value)}
      />
      <select className={styles.select} value={filters.threatLevel} onChange={(e) => set('threatLevel', e.target.value)}>
        <option value="">All levels</option>
        {LEVELS.slice(1).map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <select className={styles.select} value={filters.status} onChange={(e) => set('status', e.target.value)}>
        <option value="">All status</option>
        {STATUSES.slice(1).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input className={styles.date} type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
      <span className={styles.sep}>→</span>
      <input className={styles.date} type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
      <button className={styles.clear} onClick={clear}>Clear</button>
    </div>
  )
}
