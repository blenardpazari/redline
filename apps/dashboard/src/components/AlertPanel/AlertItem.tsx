import type { Alert } from '../../types'
import styles from './AlertItem.module.css'

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
  alert: Alert
}

export default function AlertItem({ alert }: Props) {
  const critical = alert.score >= 85
  return (
    <div className={styles.item} data-critical={String(critical)}>
      <div className={styles.top}>
        <span className={styles.type} data-critical={String(critical)}>
          {alert.threat_type}
        </span>
        <span className={styles.score} data-critical={String(critical)}>
          {alert.score.toFixed(1)}
        </span>
      </div>
      <div className={styles.meta}>
        <span className={styles.ip}>{maskIp(alert.ip)}</span>
        {alert.country !== null && <span>{alert.country}</span>}
        <span className={styles.path}>{alert.path}</span>
      </div>
      <div className={styles.bottom}>
        <span>{formatTime(alert.created_at)}</span>
        {alert.email_sent && <span className={styles.email}>email sent</span>}
      </div>
    </div>
  )
}
