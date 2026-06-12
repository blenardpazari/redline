import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout/Layout'
import ThreatMapComponent from '../components/ThreatMap/ThreatMap'
import HistoricalMap from '../components/ThreatMap/HistoricalMap'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { useServer } from '../context/ServerContext'
import { api } from '../lib/api'
import { LEVEL_DOT_VAR } from '../lib/chartTheme'
import type { LogEntry, ThreatLevel, WebSocketMessage } from '../types'

const LEVELS: ThreatLevel[] = ['critical', 'warning', 'suspicious', 'normal']

const LIVE_OPTIONS = [
  { value: '15',  label: '15 min' },
  { value: '60',  label: '1 h' },
  { value: '360', label: '6 h' },
]

const HIST_OPTIONS = [
  { value: '24',  label: '24 h' },
  { value: '72',  label: '3 d' },
  { value: '168', label: '7 d' },
]

export default function ThreatMap() {
  const { token } = useAuth()
  const { selectedServerId, servers } = useServer()
  const [mode, setMode] = useState<'live' | 'historical'>('live')
  const [liveMinutes, setLiveMinutes] = useState('60')
  const [histHours, setHistHours] = useState('24')
  const [allLive, setAllLive] = useState<LogEntry[]>([])
  const [histEntries, setHistEntries] = useState<LogEntry[]>([])
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => {
    const sid = selectedServerId ? `&server_id=${selectedServerId}` : ''
    api.get<LogEntry[]>(`/logs?limit=2000&hours=6${sid}`)
      .then(data => setAllLive(data.filter(e => e.lat !== null && e.lon !== null)))
      .catch(() => {})
  }, [selectedServerId])

  useEffect(() => {
    if (mode !== 'historical') return
    setHistLoading(true)
    const sid = selectedServerId ? `&server_id=${selectedServerId}` : ''
    api.get<LogEntry[]>(`/logs?limit=5000&hours=${histHours}${sid}`)
      .then(data => setHistEntries(data.filter(e => e.lat !== null && e.lon !== null)))
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [mode, histHours, selectedServerId])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'log_entry' && msg.data.lat !== null && msg.data.lon !== null) {
      setAllLive(prev => [{ ...msg.data, _receivedAt: Date.now() }, ...prev].slice(0, 2000))
    }
  }, [])

  useWebSocket(handleMessage, token)

  const liveEntries = useMemo(() => {
    const cutoff = Date.now() - Number(liveMinutes) * 60 * 1000
    return allLive.filter(e => new Date(e.timestamp).getTime() >= cutoff)
  }, [allLive, liveMinutes])

  const liveCounts = useMemo(() => {
    const c: Record<ThreatLevel, number> = { critical: 0, warning: 0, suspicious: 0, normal: 0 }
    for (const e of liveEntries) c[e.threat_level]++
    return c
  }, [liveEntries])

  const histCounts = useMemo(() => {
    const c: Record<ThreatLevel, number> = { critical: 0, warning: 0, suspicious: 0, normal: 0 }
    for (const e of histEntries) c[e.threat_level]++
    return c
  }, [histEntries])

  const counts = mode === 'live' ? liveCounts : histCounts
  const total  = mode === 'live' ? liveEntries.length : histEntries.length

  return (
    <Layout full>
      <div className="absolute inset-0">
        {mode === 'live'
          ? <ThreatMapComponent entries={liveEntries} servers={servers} />
          : <HistoricalMap entries={histEntries} loading={histLoading} />
        }
      </div>

      {/* Mode toggle */}
      <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="flex rounded-lg border border-border bg-surface/90 p-0.5 shadow-lg backdrop-blur">
          {(['live', 'historical'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                mode === m ? 'bg-surface-2 text-fg shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              {m === 'live'
                ? <><span className="inline-block h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />Live</>
                : '⊙ Historical'
              }
            </button>
          ))}
        </div>

        {/* Time window */}
        <div className="flex gap-1 rounded-lg border border-border bg-surface/90 p-1 shadow-lg backdrop-blur">
          {(mode === 'live' ? LIVE_OPTIONS : HIST_OPTIONS).map(o => (
            <button
              key={o.value}
              onClick={() => mode === 'live' ? setLiveMinutes(o.value) : setHistHours(o.value)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                (mode === 'live' ? liveMinutes : histHours) === o.value
                  ? 'bg-surface-2 text-fg'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-5 left-5 z-[1000] w-52 rounded-lg border border-border bg-surface/90 p-3.5 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {mode === 'live' ? `Last ${liveMinutes} min` : `Last ${histHours}h`}
          </span>
          <span className="font-mono text-xs text-dim">{total}</span>
        </div>
        {LEVELS.map(level => (
          <div key={level} className="flex items-center gap-2 py-0.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_DOT_VAR[level] }} />
            <span className="capitalize text-muted">{level}</span>
            <span className="ml-auto font-mono tabular-nums">{counts[level]}</span>
          </div>
        ))}
        {servers.some(s => s.lat) && (
          <div className="mt-2 border-t border-border pt-2 flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4f8ef7] ring-2 ring-[#4f8ef7]/40 shrink-0" />
            <span className="text-muted">Your servers</span>
            <span className="ml-auto font-mono tabular-nums text-dim">{servers.filter(s => s.lat).length}</span>
          </div>
        )}
        {mode === 'historical' && (
          <div className="mt-2 border-t border-border pt-2 text-[10px] text-dim">
            Circles sized by request volume
          </div>
        )}
      </div>
    </Layout>
  )
}
