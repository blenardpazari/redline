import type { Alert } from '../../types'
import AlertItem from './AlertItem'
import styles from './AlertPanel.module.css'

interface Props {
  alerts: Alert[]
}

export default function AlertPanel({ alerts }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Alerts</span>
        <span className={styles.count}>{alerts.length}</span>
      </div>
      <div className={styles.list}>
        {alerts.length === 0 ? (
          <p className={styles.empty}>No active alerts</p>
        ) : (
          alerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  )
}
