import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout/Layout'
import Select from '../components/ui/Select'
import { api } from '../lib/api'

interface ClusterIP { ip: string; count: number }
interface Cluster {
  id: number
  size: number
  top_ips: ClusterIP[]
  threat_types: Record<string, number>
  avg_score: number
  top_paths: string[]
}
interface ClusteringData {
  clusters: Cluster[]
  noise: number
  total: number
  hours: number
  error?: string
}

const HOURS_OPTIONS = [
  { value: '1',   label: 'Last 1 hour' },
  { value: '6',   label: 'Last 6 hours' },
  { value: '24',  label: 'Last 24 hours' },
  { value: '72',  label: 'Last 3 days' },
  { value: '168', label: 'Last 7 days' },
]

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'text-crit bg-crit/10' : score >= 70 ? 'text-warn bg-warn/10' : 'text-sus bg-sus/10'
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${color}`}>
      {score.toFixed(0)}
    </span>
  )
}

function ThreatTypePills({ types }: { types: Record<string, number> }) {
  const COLOR: Record<string, string> = {
    BRUTE_FORCE: 'bg-crit/10 text-crit',
    SQL_INJECTION: 'bg-warn/10 text-warn',
    SCANNER: 'bg-sus/10 text-sus',
    PATH_TRAVERSAL: 'bg-purple-500/10 text-purple-400',
    BOT: 'bg-blue-500/10 text-blue-400',
    NORMAL: 'bg-ok/10 text-ok',
  }
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(types).map(([t, n]) => (
        <span key={t} className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${COLOR[t] ?? 'bg-surface-2 text-muted'}`}>
          {t.replace('_', ' ')} ×{n}
        </span>
      ))}
    </div>
  )
}

export default function Clustering() {
  const [hours, setHours] = useState('24')
  const [data, setData] = useState<ClusteringData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.get<ClusteringData>(`/clustering?hours=${hours}`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [hours])

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Attack Clustering</h1>
            <p className="text-sm text-muted">
              DBSCAN clustering of suspicious requests by time, path length, and threat score
            </p>
          </div>
          <Select
            value={hours}
            onChange={setHours}
            options={HOURS_OPTIONS}
            className="w-40"
          />
        </div>

        {/* Summary strip */}
        {data && !data.error && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[
              { label: 'Clusters found', value: data.clusters.length },
              { label: 'Total events', value: data.total.toLocaleString() },
              { label: 'Unclustered (noise)', value: data.noise.toLocaleString() },
              { label: 'Cluster coverage', value: `${data.total > 0 ? (((data.total - data.noise) / data.total) * 100).toFixed(0) : 0}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col rounded-lg border border-border bg-surface-2 px-4 py-3">
                <span className="font-mono text-lg font-bold text-fg">{value}</span>
                <span className="text-[11px] uppercase tracking-wide text-dim">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Clusters */}
        {loading && (
          <div className="flex h-40 items-center justify-center text-sm text-dim">Loading...</div>
        )}

        {data?.error && (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-crit">
            {data.error}
          </div>
        )}

        {data && !data.error && !loading && data.clusters.length === 0 && (
          <div className="rounded-lg border border-border bg-surface p-10 text-center">
            <p className="text-sm font-medium text-fg">No clusters found</p>
            <p className="mt-1 text-xs text-muted">Not enough suspicious activity in this time window for DBSCAN to form groups.</p>
          </div>
        )}

        {!loading && data && data.clusters.map(cluster => (
          <div key={cluster.id} className="rounded-lg border border-border bg-surface shadow-sm">
            {/* Cluster header */}
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2 transition-colors"
              onClick={() => setExpanded(expanded === cluster.id ? null : cluster.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 font-mono text-xs font-bold text-muted">
                  #{cluster.id + 1}
                </span>
                <div>
                  <span className="text-sm font-semibold text-fg">{cluster.size} events</span>
                  <span className="ml-2 text-xs text-muted">
                    {cluster.top_ips.length} unique IPs
                  </span>
                </div>
                <ThreatTypePills types={cluster.threat_types} />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[11px] text-dim">Avg score</div>
                  <ScoreBadge score={cluster.avg_score} />
                </div>
                <svg
                  className={`h-4 w-4 text-muted transition-transform ${expanded === cluster.id ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </button>

            {/* Expanded detail */}
            {expanded === cluster.id && (
              <div className="border-t border-border px-4 py-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dim">Top IPs</div>
                    <div className="space-y-1">
                      {cluster.top_ips.map(({ ip, count }) => (
                        <div key={ip} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-surface-2">
                          <button
                            onClick={() => navigate(`/ip/${ip}`)}
                            className="font-mono text-xs text-accent hover:underline"
                          >
                            {ip}
                          </button>
                          <span className="font-mono text-[11px] text-muted">{count} requests</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dim">Top Paths</div>
                    <div className="space-y-1">
                      {cluster.top_paths.map(path => (
                        <div key={path} className="truncate rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] text-muted" title={path}>
                          {path}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  )
}
