import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { HealthResponse } from '../types'
import styles from './Health.module.css'

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

  if (loading) return <Layout><div className={styles.loading}>Loading…</div></Layout>
  if (!data) return <Layout><div className={styles.loading}>Failed to load health data.</div></Layout>

  const metrics = [
    { label: 'Status', value: data.status.toUpperCase(), accent: data.status === 'ok' ? '#4ade80' : '#ef4444' },
    { label: 'Uptime', value: fmtUptime(data.uptime_seconds) },
    { label: 'API Version', value: data.api_version },
    { label: 'ML Model', value: data.ml_model_version.replace('trained-', 'Built ').replace(/(\d{10})/, ts => new Date(parseInt(ts) * 1000).toLocaleDateString()) },
    { label: 'DB Size', value: fmt(data.db_size_bytes) },
    { label: 'Total Logs', value: data.db_log_count.toLocaleString() },
    { label: 'Total Alerts', value: data.db_alert_count.toLocaleString() },
    { label: 'Servers', value: `${data.servers_online} / ${data.servers_total} online`, accent: data.servers_online > 0 ? '#4ade80' : '#f59e0b' },
  ]

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>System Health</h1>
            <p className={styles.subtitle}>API status, database metrics, and ML model info</p>
          </div>
          <button className={styles.refreshBtn} onClick={load}>↻ Refresh</button>
        </div>

        <div className={styles.grid}>
          {metrics.map(m => (
            <div key={m.label} className={styles.card}>
              <span className={styles.label}>{m.label}</span>
              <span className={styles.value} style={m.accent ? { color: m.accent } : {}}>{m.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Servers</h2>
          <p className={styles.sectionSub}>
            {data.servers_total === 0
              ? 'No servers configured. Go to Servers to add your first server.'
              : `${data.servers_online} of ${data.servers_total} servers are online.`}
          </p>
          <div className={styles.serverBar}>
            {data.servers_total > 0 && (
              <div
                className={styles.serverFill}
                style={{ width: `${(data.servers_online / data.servers_total) * 100}%` }}
              />
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Database</h2>
          <div className={styles.dbRow}>
            <div className={styles.dbStat}><span className={styles.dbLabel}>Log entries</span><span className={styles.dbVal}>{data.db_log_count.toLocaleString()}</span></div>
            <div className={styles.dbStat}><span className={styles.dbLabel}>Alerts</span><span className={styles.dbVal}>{data.db_alert_count.toLocaleString()}</span></div>
            <div className={styles.dbStat}><span className={styles.dbLabel}>File size</span><span className={styles.dbVal}>{fmt(data.db_size_bytes)}</span></div>
          </div>
          <div className={styles.purgeRow}>
            <div>
              <p className={styles.purgeHint}>Logs are automatically purged after 30 days. You can also purge manually.</p>
              {purgeResult && <p className={styles.purgeResult}>{purgeResult}</p>}
            </div>
            <div className={styles.purgeActions}>
              <button className={styles.purgeBtn} onClick={handlePurge} disabled={purging}>
                {purging ? 'Working…' : 'Purge old logs'}
              </button>
              <button className={styles.purgeAllBtn} onClick={handlePurgeAll} disabled={purging}>
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
