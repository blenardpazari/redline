import type { LogEntry, ThreatLevel } from '../../types'
import styles from './RequestsTable.module.css'

const ROW_BG: Record<ThreatLevel, string> = {
  critical:   'rgba(239,68,68,0.08)',
  warning:    'rgba(249,115,22,0.06)',
  suspicious: 'rgba(234,179,8,0.05)',
  normal:     'transparent',
}

const SCORE_COLOR: Record<ThreatLevel, string> = {
  critical: '#ef4444', warning: '#f97316', suspicious: '#eab308', normal: '#22c55e',
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

interface Props { requests: LogEntry[] }

export default function RequestsTable({ requests }: Props) {
  return (
    <div className={styles.wrap}>
      <span className={styles.heading}>Last {requests.length} requests</span>
      <div className={styles.table}>
        <div className={styles.headerRow}>
          <span>Time</span><span>Method</span><span>Path</span>
          <span>Status</span><span>Score</span><span>Type</span>
        </div>
        {requests.map((r) => (
          <div key={r.id} className={styles.row} style={{ background: ROW_BG[r.threat_level] }}>
            <span className={styles.muted}>{fmtTime(r.timestamp)}</span>
            <span className={styles.muted}>{r.method}</span>
            <span className={styles.path}>{r.path}</span>
            <span className={styles.muted}>{r.status_code}</span>
            <span style={{ color: SCORE_COLOR[r.threat_level] }}>{r.threat_score.toFixed(1)}</span>
            <span className={styles.muted}>{r.threat_type ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
