import { useEffect, useState } from 'react'
import BarBreakdown from '../components/Analytics/BarBreakdown'
import MetricCards from '../components/Analytics/MetricCards'
import TrendChart from '../components/Analytics/TrendChart'
import Layout from '../components/Layout/Layout'
import { useServer } from '../context/ServerContext'
import { api } from '../lib/api'
import type { AnalyticsPoint, AnalyticsResponse } from '../types'

type Range = '24h' | '7d' | '30d'
const RANGES: Range[] = ['24h', '7d', '30d']

function toPoints(r: AnalyticsResponse): AnalyticsPoint[] {
  return r.labels.map((label, i) => ({
    label,
    normal:   r.normal[i]   ?? 0,
    anomaly:  r.anomaly[i]  ?? 0,
    critical: r.critical[i] ?? 0,
  }))
}

export default function Analytics() {
  const { selectedServerId } = useServer()
  const [range, setRange] = useState<Range>('24h')
  const [data, setData] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    const sid = selectedServerId ? `&server_id=${selectedServerId}` : ''
    api.get<AnalyticsResponse>(`/analytics?range=${range}${sid}`)
      .then(setData)
      .catch(() => undefined)
  }, [range, selectedServerId])

  const points = data ? toPoints(data) : []
  const total = points.reduce((s, p) => s + p.normal + p.anomaly + p.critical, 0)
  const anomalies = points.reduce((s, p) => s + p.anomaly + p.critical, 0)
  const anomalyRate = total > 0 ? (anomalies / total) * 100 : 0

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted">Traffic trends and anomaly rates</p>
          </div>
          <div className="flex rounded-md border border-border bg-surface p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-fg'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <MetricCards total={total} anomalyRate={anomalyRate} peak={data?.peak_per_minute ?? 0} />
        <TrendChart points={points} range={range} />
        <BarBreakdown points={points} range={range} />
      </div>
    </Layout>
  )
}
