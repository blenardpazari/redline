import { useCallback, useState } from 'react'
import Layout from '../components/Layout/Layout'
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
    <Layout>
      <div className={styles.map}>
        <ThreatMapComponent entries={entries} />
      </div>
    </Layout>
  )
}
