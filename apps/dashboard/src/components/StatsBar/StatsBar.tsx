import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Stats } from '../../types'

function Stat({
  label,
  value,
  valueClass = 'text-fg',
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <div className={`font-mono text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats>({
    requests_today: 0,
    anomalies_today: 0,
    redlines_today: 0,
  })

  useEffect(() => {
    function fetchStats() {
      api.get<Stats>('/stats').then(setStats).catch(() => undefined)
    }
    fetchStats()
    const id = setInterval(fetchStats, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex gap-4">
      <Stat label="Requests Today" value={stats.requests_today} />
      <Stat label="Anomalies" value={stats.anomalies_today} valueClass="text-sus" />
      <Stat label="Redlines Crossed" value={stats.redlines_today} valueClass="text-crit" />
    </div>
  )
}
