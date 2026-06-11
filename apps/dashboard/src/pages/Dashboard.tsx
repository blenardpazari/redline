import { useCallback, useEffect, useState } from 'react'
import AlertPanel from '../components/AlertPanel/AlertPanel'
import Layout from '../components/Layout/Layout'
import LiveFeed from '../components/LiveFeed/LiveFeed'
import StatsBar from '../components/StatsBar/StatsBar'
import ThreatChart from '../components/ThreatChart/ThreatChart'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { useServer } from '../context/ServerContext'
import { api } from '../lib/api'
import type { Alert, ChartDataPoint, LogEntry, WebSocketMessage, Server } from '../types'
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

interface TopAttacker { ip: string; country: string | null; count: number; max_score: number; threat_type: string | null }

export default function Dashboard() {
  const { token } = useAuth()
  const { servers, selectedServerId } = useServer()
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [topAttackers, setTopAttackers] = useState<TopAttacker[]>([])

  useEffect(() => {
    const sid = selectedServerId ? `&server_id=${selectedServerId}` : ''
    api.get<LogEntry[]>(`/logs?limit=50${sid}`).then(setEntries).catch(() => undefined)
    api.get<Alert[]>(`/alerts?limit=20${sid}`).then(setAlerts).catch(() => undefined)
  }, [selectedServerId])

  useEffect(() => {
    if (entries.length === 0) return
    const map = new Map<string, TopAttacker>()
    for (const e of entries) {
      if (e.threat_level === 'normal') continue
      const existing = map.get(e.ip)
      if (existing) {
        existing.count++
        if (e.threat_score > existing.max_score) {
          existing.max_score = e.threat_score
          existing.threat_type = e.threat_type
        }
      } else {
        map.set(e.ip, { ip: e.ip, country: e.country, count: 1, max_score: e.threat_score, threat_type: e.threat_type })
      }
    }
    setTopAttackers([...map.values()].sort((a, b) => b.max_score - a.max_score).slice(0, 5))
  }, [entries])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'log_entry') {
      setEntries((prev) => [msg.data, ...prev].slice(0, MAX_ENTRIES))
      setChartData((prev) => buildChartPoint(msg.data, prev))
    } else {
      setAlerts((prev) => [msg.data, ...prev].slice(0, 50))
    }
  }, [])

  useWebSocket(handleMessage, token)

  function statusDot(s: Server) {
    const colors: Record<string, string> = { online: '#4ade80', offline: '#475569', unconfigured: '#f59e0b' }
    return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: colors[s.status] ?? '#475569', marginRight: 6 }} />
  }

  function scoreColor(score: number) {
    if (score >= 85) return '#ef4444'
    if (score >= 70) return '#f97316'
    return '#eab308'
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.statsRow}><StatsBar /></div>
        <div className={styles.main}>
          <LiveFeed entries={entries} />
          <AlertPanel alerts={alerts} />
        </div>

        {(servers.length > 0 || topAttackers.length > 0) && (
          <div className={styles.widgetRow}>
            {servers.length > 0 && (
              <div className={styles.widget}>
                <h3 className={styles.widgetTitle}>Sites</h3>
                <div className={styles.serverList}>
                  {servers.map(s => (
                    <div key={s.id} className={styles.serverRow}>
                      <div className={styles.serverLeft}>
                        {statusDot(s)}
                        <span className={styles.serverName}>{s.name}</span>
                        <span className={styles.serverEnv}>{s.env}</span>
                      </div>
                      <div className={styles.serverRight}>
                        <span className={styles.serverEvents}>{(s.total_events ?? 0).toLocaleString()} events</span>
                        <span className={styles.serverSeen}>{s.last_seen ? new Date(s.last_seen).toLocaleTimeString() : 'never'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topAttackers.length > 0 && (
              <div className={styles.widget}>
                <h3 className={styles.widgetTitle}>Top Attackers <span className={styles.widgetSub}>(current session)</span></h3>
                <div className={styles.attackerList}>
                  {topAttackers.map((a, i) => (
                    <div key={a.ip} className={styles.attackerRow}>
                      <span className={styles.rank}>#{i + 1}</span>
                      <div className={styles.attackerInfo}>
                        <span className={styles.attackerIp}>{a.ip}</span>
                        <span className={styles.attackerMeta}>{a.country} · {a.threat_type} · {a.count} hits</span>
                      </div>
                      <span className={styles.attackerScore} style={{ color: scoreColor(a.max_score) }}>
                        {a.max_score.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.chartRow}><ThreatChart data={chartData} /></div>
      </div>
    </Layout>
  )
}
