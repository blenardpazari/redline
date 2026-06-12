import { useCallback, useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

import { Link } from 'react-router-dom'
import Layout from '../components/Layout/Layout'
import SortableWidget from '../components/Dashboard/SortableWidget'
import MiniMap from '../components/Dashboard/MiniMap'
import LiveFeed from '../components/LiveFeed/LiveFeed'
import AlertPanel from '../components/AlertPanel/AlertPanel'
import StatsBar from '../components/StatsBar/StatsBar'
import ThreatChart from '../components/ThreatChart/ThreatChart'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { useServer } from '../context/ServerContext'
import { useDashboardLayout, WIDGET_SPAN } from '../hooks/useDashboardLayout'
import { api } from '../lib/api'
import { scoreTextClass } from '../lib/chartTheme'
import type { Alert, ChartDataPoint, LogEntry, WebSocketMessage, Server } from '../types'

const MAX_ENTRIES = 200

function buildChartPoint(entry: LogEntry, prev: ChartDataPoint[]): ChartDataPoint[] {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit',
  })
  const isAnomaly = entry.threat_level !== 'normal'
  const existing = prev.find(p => p.time === time)
  const updated = existing
    ? prev.map(p => p.time !== time ? p : {
        ...p,
        normal:  isAnomaly ? p.normal  : Math.max(p.normal,  entry.threat_score),
        anomaly: isAnomaly ? Math.max(p.anomaly, entry.threat_score) : p.anomaly,
      })
    : [...prev, { time, normal: isAnomaly ? 0 : entry.threat_score, anomaly: isAnomaly ? entry.threat_score : 0 }]
  return updated.slice(-60)
}

interface TopAttacker { ip: string; country: string | null; count: number; max_score: number; threat_type: string | null }

const STATUS_DOT: Record<string, string> = {
  online: 'bg-ok', offline: 'bg-dim', unconfigured: 'bg-sus',
}

function statusDot(s: Server) {
  return <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.status] ?? 'bg-dim'}`} />
}

export default function Dashboard() {
  const { token } = useAuth()
  const { servers, selectedServerId } = useServer()
  const { order, reorder, reset } = useDashboardLayout()

  const [entries, setEntries] = useState<LogEntry[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [topAttackers, setTopAttackers] = useState<TopAttacker[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

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
      const ex = map.get(e.ip)
      if (ex) {
        ex.count++
        if (e.threat_score > ex.max_score) { ex.max_score = e.threat_score; ex.threat_type = e.threat_type }
      } else {
        map.set(e.ip, { ip: e.ip, country: e.country, count: 1, max_score: e.threat_score, threat_type: e.threat_type })
      }
    }
    setTopAttackers([...map.values()].sort((a, b) => b.max_score - a.max_score).slice(0, 5))
  }, [entries])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'log_entry') {
      setEntries(prev => [msg.data, ...prev].slice(0, MAX_ENTRIES))
      setChartData(prev => buildChartPoint(msg.data, prev))
    } else {
      setAlerts(prev => [msg.data, ...prev].slice(0, 50))
    }
  }, [])

  useWebSocket(handleMessage, token)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as any)
      const newIndex = order.indexOf(over.id as any)
      reorder(arrayMove(order, oldIndex, newIndex))
    }
  }

  const widgets: Record<string, React.ReactNode> = {
    stats: (
      <div className="p-4">
        <StatsBar />
      </div>
    ),
    live_feed: <LiveFeed entries={entries} bare />,
    alerts: <AlertPanel alerts={alerts} bare />,
    chart: (
      <div className="p-4">
        <ThreatChart data={chartData} />
      </div>
    ),
    attackers: (
      <div className="h-80 overflow-y-auto divide-y divide-border/60">
        {topAttackers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-dim">No attackers detected yet</p>
        ) : topAttackers.map((a, i) => (
          <div key={a.ip} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-6 font-mono text-xs text-dim">#{i + 1}</span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/logs?q=${encodeURIComponent(a.ip)}`}
                className="font-mono text-sm hover:underline hover:text-accent transition-colors"
              >
                {a.ip}
              </Link>
              <div className="truncate text-xs text-muted">{a.country} · {a.threat_type} · {a.count} hits</div>
            </div>
            <span className={`font-mono text-sm font-semibold ${scoreTextClass(a.max_score)}`}>
              {a.max_score.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    ),
    sites: (
      <div className="divide-y divide-border/60">
        {servers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-dim">No sites configured</p>
        ) : servers.map(s => (
          <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div className="flex items-center">
              {statusDot(s)}
              <span className="font-medium">{s.name}</span>
              <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{s.env}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="font-mono">{(s.total_events ?? 0).toLocaleString()} events</span>
              <span className="font-mono text-dim">{s.last_seen ? new Date(s.last_seen).toLocaleTimeString() : 'never'}</span>
            </div>
          </div>
        ))}
      </div>
    ),
    map: <MiniMap entries={entries} servers={servers} />,
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
            <p className="text-sm text-muted">Real-time traffic and threat monitoring</p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-dim hover:text-muted transition-colors"
            title="Reset widget order"
          >
            Reset layout
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {order.map(id => (
                <SortableWidget
                  key={id}
                  id={id}
                  className={WIDGET_SPAN[id] === 'full' ? 'md:col-span-2' : 'md:col-span-1'}
                >
                  {widgets[id]}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </Layout>
  )
}
