import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout/Layout'
import ThreatMapComponent from '../components/ThreatMap/ThreatMap'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { useServer } from '../context/ServerContext'
import { api } from '../lib/api'
import { LEVEL_DOT_VAR } from '../lib/chartTheme'
import type { LogEntry, ThreatLevel, WebSocketMessage } from '../types'

const LEVELS: ThreatLevel[] = ['critical', 'warning', 'suspicious', 'normal']

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

  const counts = useMemo(() => {
    const c: Record<ThreatLevel, number> = { critical: 0, warning: 0, suspicious: 0, normal: 0 }
    for (const e of entries) c[e.threat_level]++
    return c
  }, [entries])

  return (
    <Layout full>
      <div className="absolute inset-0">
        <ThreatMapComponent entries={entries} />
      </div>

      {/* Legend / live stats overlay */}
      <div className="absolute bottom-5 left-5 z-[1000] w-52 rounded-lg border border-border bg-surface/90 p-3.5 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Live events</span>
          <span className="font-mono text-xs text-dim">{entries.length}</span>
        </div>
        {LEVELS.map(level => (
          <div key={level} className="flex items-center gap-2 py-0.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_DOT_VAR[level] }} />
            <span className="capitalize text-muted">{level}</span>
            <span className="ml-auto font-mono tabular-nums">{counts[level]}</span>
          </div>
        ))}
      </div>
    </Layout>
  )
}
