import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { IconRefresh } from '../components/ui/icons'
import { api } from '../lib/api'
import type { HealthResponse } from '../types'

function fmt(bytes: number) {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(2) + ' GB'
  if (bytes > 1e6) return (bytes / 1e6).toFixed(2) + ' MB'
  return (bytes / 1e3).toFixed(1) + ' KB'
}

function fmtUptime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function Health() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api.get<HealthResponse>('/health').then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }

  async function handlePurge() {
    if (!confirm('Delete all log entries and alerts older than 30 days? This cannot be undone.')) return
    setPurging(true)
    setPurgeResult(null)
    try {
      const res = await api.delete<{ deleted_logs: number; deleted_alerts: number; retention_days: number }>('/health/purge')
      setPurgeResult(`Purged ${res.deleted_logs.toLocaleString()} log entries and ${res.deleted_alerts.toLocaleString()} alerts older than ${res.retention_days} days.`)
      load()
    } catch {
      setPurgeResult('Purge failed.')
    } finally {
      setPurging(false)
    }
  }

  async function handlePurgeAll() {
    if (!confirm('Delete ALL log entries and alerts? This cannot be undone.')) return
    setPurging(true)
    setPurgeResult(null)
    try {
      const res = await api.delete<{ deleted_logs: number; deleted_alerts: number }>('/health/purge/all')
      setPurgeResult(`Cleared ${res.deleted_logs.toLocaleString()} log entries and ${res.deleted_alerts.toLocaleString()} alerts.`)
      load()
    } catch {
      setPurgeResult('Clear failed.')
    } finally {
      setPurging(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <Layout><div className="py-24 text-center text-sm text-dim">Loading…</div></Layout>
  if (!data) return <Layout><div className="py-24 text-center text-sm text-dim">Failed to load health data.</div></Layout>

  const metrics: { label: string; value: string; cls?: string }[] = [
    { label: 'Status', value: data.status.toUpperCase(), cls: data.status === 'ok' ? 'text-ok' : 'text-crit' },
    { label: 'Uptime', value: fmtUptime(data.uptime_seconds) },
    { label: 'API Version', value: data.api_version },
    { label: 'ML Model', value: data.ml_model_version.replace('trained-', 'Built ').replace(/(\d{10})/, ts => new Date(parseInt(ts) * 1000).toLocaleDateString()) },
    { label: 'DB Size', value: fmt(data.db_size_bytes) },
    { label: 'Total Logs', value: data.db_log_count.toLocaleString() },
    { label: 'Total Alerts', value: data.db_alert_count.toLocaleString() },
    { label: 'Servers', value: `${data.servers_online} / ${data.servers_total} online`, cls: data.servers_online > 0 ? 'text-ok' : 'text-sus' },
  ]

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">System Health</h1>
            <p className="text-sm text-muted">API status, database metrics, and ML model info</p>
          </div>
          <button
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
            onClick={load}
          >
            <IconRefresh size={14} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {metrics.map(m => (
            <div key={m.label} className="rounded-lg border border-border bg-surface px-4 py-3.5 shadow-sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-dim">{m.label}</div>
              <div className={`mt-1 truncate font-mono text-base font-semibold ${m.cls ?? ''}`}>{m.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Servers</h2>
          <p className="mb-3 mt-1 text-sm text-muted">
            {data.servers_total === 0
              ? 'No servers configured. Go to Sites to add your first server.'
              : `${data.servers_online} of ${data.servers_total} servers are online.`}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            {data.servers_total > 0 && (
              <div
                className="h-full rounded-full bg-ok transition-all"
                style={{ width: `${(data.servers_online / data.servers_total) * 100}%` }}
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Database</h2>
          <div className="mb-5 flex gap-8">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-dim">Log entries</div>
              <div className="mt-0.5 font-mono text-lg font-semibold">{data.db_log_count.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-dim">Alerts</div>
              <div className="mt-0.5 font-mono text-lg font-semibold">{data.db_alert_count.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-dim">File size</div>
              <div className="mt-0.5 font-mono text-lg font-semibold">{fmt(data.db_size_bytes)}</div>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted">Logs are automatically purged after 30 days. You can also purge manually.</p>
              {purgeResult && <p className="mt-1 text-xs text-ok">{purgeResult}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded-md border border-border px-3 py-2 text-[13px] text-muted transition-colors enabled:hover:border-border-strong enabled:hover:text-fg disabled:opacity-50"
                onClick={handlePurge}
                disabled={purging}
              >
                {purging ? 'Working…' : 'Purge old logs'}
              </button>
              <button
                className="rounded-md border border-crit/30 px-3 py-2 text-[13px] text-crit transition-colors enabled:hover:bg-crit/10 disabled:opacity-50"
                onClick={handlePurgeAll}
                disabled={purging}
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
