import type { Connector, ConnectorStatus } from '../../types'
import styles from './ConnectorCard.module.css'

const STATUS_LABEL: Record<ConnectorStatus, string> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  unconfigured: 'UNCONFIGURED',
}

const STATUS_CLASS: Record<ConnectorStatus, string> = {
  active: styles.statusActive,
  inactive: styles.statusInactive,
  unconfigured: styles.statusUnconfigured,
}

function fmtTime(ts: string | null): string {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

interface Props { connector: Connector }

export default function ConnectorCard({ connector }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.left}>
          <span className={styles.name}>{connector.name}</span>
          <span className={styles.sourceType}>{connector.source_type}</span>
        </div>
        <span className={`${styles.status} ${STATUS_CLASS[connector.status]}`}>
          {STATUS_LABEL[connector.status]}
        </span>
      </div>
      <p className={styles.desc}>{connector.description}</p>
      <div className={styles.footer}>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Events</span>
          <span className={styles.statValue}>{connector.total_events.toLocaleString()}</span>
        </span>
        <span className={styles.stat}>
          <span className={styles.statLabel}>Last event</span>
          <span className={styles.statValue}>{fmtTime(connector.last_event)}</span>
        </span>
      </div>
    </div>
  )
}
