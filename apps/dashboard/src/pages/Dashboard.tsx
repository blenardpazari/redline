import { useCallback, useEffect, useState } from 'react'
import AlertPanel from '../components/AlertPanel/AlertPanel'
import Layout from '../components/Layout/Layout'
import LiveFeed from '../components/LiveFeed/LiveFeed'
import StatsBar from '../components/StatsBar/StatsBar'
import ThreatChart from '../components/ThreatChart/ThreatChart'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { api } from '../lib/api'
import type { Alert, ChartDataPoint, LogEntry, WebSocketMessage } from '../types'
import styles from './Dashboard.module.css'

const MAX_ENTRIES = 200

function buildChartPoint(entry: LogEntry, prev: ChartDataPoint[]): ChartDataPoint[] {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit',
  })
  const isAnomaly = entry.threat_level !== 'normal'
  const existing = prev.find((p) => p.time === time)
  const updated = existing
    ? prev.map((p) => p.time !== time ? p : {
        ...p,
        normal:  isAnomaly ? p.normal  : Math.max(p.normal,  entry.threat_score),
        anomaly: isAnomaly ? Math.max(p.anomaly, entry.threat_score) : p.anomaly,
      })
    : [...prev, { time, normal: isAnomaly ? 0 : entry.threat_score, anomaly: isAnomaly ? entry.threat_score : 0 }]
  return updated.slice(-60)
}

export default function Dashboard() {
  const { token } = useAuth()
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  useEffect(() => {
    api.get<LogEntry[]>('/logs?limit=50').then(setEntries).catch(() => undefined)
    api.get<Alert[]>('/alerts?limit=20').then(setAlerts).catch(() => undefined)
  }, [])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'log_entry') {
      setEntries((prev) => [msg.data, ...prev].slice(0, MAX_ENTRIES))
      setChartData((prev) => buildChartPoint(msg.data, prev))
    } else {
      setAlerts((prev) => [msg.data, ...prev].slice(0, 50))
    }
  }, [])

  useWebSocket(handleMessage, token)

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.statsRow}><StatsBar /></div>
        <div className={styles.main}>
          <LiveFeed entries={entries} />
          <AlertPanel alerts={alerts} />
        </div>
        <div className={styles.chartRow}><ThreatChart data={chartData} /></div>
      </div>
    </Layout>
  )
}
