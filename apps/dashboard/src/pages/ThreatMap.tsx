import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import ThreatMapComponent from '../components/ThreatMap/ThreatMap'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { useServer } from '../context/ServerContext'
import { api } from '../lib/api'
import type { LogEntry, WebSocketMessage } from '../types'
import styles from './ThreatMap.module.css'

export default function ThreatMap() {
  const { token } = useAuth()
  const { selectedServerId } = useServer()
  const [entries, setEntries] = useState<LogEntry[]>([])

  useEffect(() => {
    const sid = selectedServerId ? `&server_id=${selectedServerId}` : ''
    api.get<LogEntry[]>(`/logs?limit=500${sid}`)
      .then(data => setEntries(data.filter(e => e.lat !== null && e.lon !== null)))
      .catch(() => {})
  }, [selectedServerId])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'log_entry' && msg.data.lat !== null && msg.data.lon !== null) {
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
