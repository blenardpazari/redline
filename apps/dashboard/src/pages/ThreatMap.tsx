import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import ThreatMapComponent from '../components/ThreatMap/ThreatMap'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import type { LogEntry, WebSocketMessage } from '../types'
import styles from './ThreatMap.module.css'

export default function ThreatMap() {
  const { token } = useAuth()
  const [entries, setEntries] = useState<LogEntry[]>([])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'log_entry') {
      setEntries((prev) => [msg.data, ...prev].slice(0, 500))
    }
  }, [])

  useWebSocket(handleMessage, token)

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <span className={styles.navTitle}>Redline</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/" className={styles.navLink}>Dashboard</Link>
          <Link to="/insights" className={styles.navLink}>Insights</Link>
        </div>
      </nav>
      <div className={styles.map}>
        <ThreatMapComponent entries={entries} />
      </div>
    </div>
  )
}
