import { useNavigate } from 'react-router-dom'
import type { LogEntry, ThreatLevel } from '../../types'
import styles from './ResultsTable.module.css'

const ROW_BG: Record<ThreatLevel, string> = {
  critical: 'rgba(239,68,68,0.08)', warning: 'rgba(249,115,22,0.06)',
  suspicious: 'rgba(234,179,8,0.05)', normal: 'transparent',
}
const SCORE_COLOR: Record<ThreatLevel, string> = {
  critical: '#ef4444', warning: '#f97316', suspicious: '#eab308', normal: '#22c55e',
}

type SortField = 'timestamp' | 'threat_score' | 'status_code'
type SortOrder = 'asc' | 'desc'

interface Props {
  entries: LogEntry[]
  total: number
  page: number
  limit: number
  sort: SortField
  order: SortOrder
  onSort: (field: SortField) => void
  onPage: (p: number) => void
}

function maskIp(ip: string) {
  const p = ip.split('.')
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : ip
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ResultsTable({ entries, total, page, limit, sort, order, onSort, onPage }: Props) {
  const navigate = useNavigate()
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  function th(label: string, field: SortField) {
    const active = sort === field
    return (
      <span className={`${styles.th} ${active ? styles.thActive : ''}`} onClick={() => onSort(field)}>
        {label}{active ? (order === 'asc' ? ' ↑' : ' ↓') : ''}
      </span>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        {th('Time', 'timestamp')}<span className={styles.th}>IP</span>
        <span className={styles.th}>Method</span><span className={styles.th}>Path</span>
        {th('Status', 'status_code')}{th('Score', 'threat_score')}
        <span className={styles.th}>Threat</span>
      </div>
      {entries.map((e) => (
        <div key={e.id} className={styles.row} style={{ background: ROW_BG[e.threat_level] }}>
          <span className={styles.muted}>{fmtTime(e.timestamp)}</span>
          <span className={styles.ip} onClick={() => navigate(`/ip/${e.ip}`)}>{maskIp(e.ip)}</span>
          <span className={styles.muted}>{e.method}</span>
          <span className={styles.path}>{e.path}</span>
          <span className={styles.muted}>{e.status_code}</span>
          <span style={{ color: SCORE_COLOR[e.threat_level] }}>{e.threat_score.toFixed(1)}</span>
          <span className={styles.muted}>{e.threat_level}</span>
        </div>
      ))}
      <div className={styles.pagination}>
        <span className={styles.count}>Showing {total === 0 ? 0 : from}–{to} of {total.toLocaleString()} entries</span>
        <div className={styles.pages}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
          <span className={styles.pageInfo}>Page {page} of {pages}</span>
          <button className={styles.pageBtn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
        </div>
      </div>
    </div>
  )
}
