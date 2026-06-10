import type { LogEntry, ThreatLevel } from '../../types'
import styles from './LogRow.module.css'

const LEVEL_COLOR: Record<ThreatLevel, string> = {
  normal:     'var(--normal)',
  suspicious: 'var(--suspicious)',
  warning:    'var(--warning)',
  critical:   'var(--critical)',
}

function maskIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) return ip
  return `${parts[0]}.${parts[1]}.x.x`
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface Props {
  entry: LogEntry
}

export default function LogRow({ entry }: Props) {
  const color = LEVEL_COLOR[entry.threat_level]
  return (
    <div className={styles.row}>
      <span className={styles.dot} style={{ background: color }} />
      <span className={styles.time}>{formatTime(entry.timestamp)}</span>
      <span className={styles.country}>{entry.country ?? '--'}</span>
      <span className={styles.ip}>{maskIp(entry.ip)}</span>
      <span className={styles.method}>{entry.method}</span>
      <span className={styles.path}>{entry.path}</span>
      <span className={styles.status}>{entry.status_code}</span>
      <span className={styles.score} style={{ color }}>{entry.threat_score.toFixed(1)}</span>
    </div>
  )
}
