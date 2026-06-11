import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import { useServer } from '../context/ServerContext'
import type { AlertsFullResponse } from '../types'
import styles from './AlertHistory.module.css'

const THREAT_COLORS: Record<string, string> = {
  BRUTE_FORCE: '#ef4444', SQL_INJECTION: '#f97316', SCANNER: '#eab308',
  PATH_TRAVERSAL: '#a855f7', BOT: '#3b82f6', NORMAL: '#22c55e',
}

export default function AlertHistory() {
  const { selectedServerId } = useServer()
  const [data, setData] = useState<AlertsFullResponse | null>(null)
  const [page, setPage] = useState(1)
  const [unackedOnly, setUnackedOnly] = useState(false)
  const [acking, setAcking] = useState<number | null>(null)
  const [ackNote, setAckNote] = useState('')

  function load() {
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (selectedServerId) params.set('server_id', String(selectedServerId))
    if (unackedOnly) params.set('unacked_only', 'true')
    api.get<AlertsFullResponse>(`/alerts/history?${params}`).then(setData).catch(() => {})
  }

  useEffect(() => { setPage(1) }, [selectedServerId, unackedOnly])
  useEffect(() => { load() }, [page, selectedServerId, unackedOnly])

  async function handleAck(id: number) {
    await api.post(`/alerts/${id}/acknowledge`, { note: ackNote })
    setAcking(null)
    setAckNote('')
    load()
  }

  function scoreColor(score: number) {
    if (score >= 85) return '#ef4444'
    if (score >= 70) return '#f97316'
    return '#eab308'
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Alert History</h1>
            <p className={styles.subtitle}>All triggered alerts with acknowledgement workflow</p>
          </div>
          <label className={styles.toggle}>
            <input type="checkbox" checked={unackedOnly} onChange={e => setUnackedOnly(e.target.checked)} />
            Unacknowledged only
          </label>
        </div>

        {data && (
          <p className={styles.count}>{data.total} alerts{unackedOnly ? ' unacknowledged' : ''}</p>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th><th>IP</th><th>Country</th><th>Threat</th>
                <th>Score</th><th>Path</th><th>Email</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data?.alerts.map(a => (
                <tr key={a.id} className={a.acked_at ? styles.acked : ''}>
                  <td className={styles.mono}>{new Date(a.created_at).toLocaleString()}</td>
                  <td className={styles.mono}>{a.ip}</td>
                  <td>{a.country ?? '—'}</td>
                  <td>
                    <span className={styles.threat} style={{ color: THREAT_COLORS[a.threat_type] ?? '#94a3b8' }}>
                      {a.threat_type}
                    </span>
                  </td>
                  <td>
                    <span className={styles.score} style={{ color: scoreColor(a.score) }}>
                      {a.score.toFixed(1)}
                    </span>
                  </td>
                  <td className={`${styles.mono} ${styles.path}`}>{a.path}</td>
                  <td>{a.email_sent ? '✉️' : '—'}</td>
                  <td>
                    {a.acked_at
                      ? <span className={styles.ackedBadge} title={`by ${a.acked_by}${a.ack_note ? `: ${a.ack_note}` : ''}`}>✓ Acked</span>
                      : <span className={styles.pendingBadge}>Pending</span>}
                  </td>
                  <td>
                    {!a.acked_at && (
                      <button className={styles.ackBtn} onClick={() => setAcking(a.id)}>Acknowledge</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.total > 50 && (
          <div className={styles.pagination}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Prev</button>
            <span className={styles.pageInfo}>Page {page} of {Math.ceil(data.total / 50)}</span>
            <button disabled={page >= Math.ceil(data.total / 50)} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Next →</button>
          </div>
        )}

        {acking !== null && (
          <div className={styles.modal}>
            <div className={styles.modalBox}>
              <h2 className={styles.modalTitle}>Acknowledge Alert</h2>
              <p className={styles.modalSub}>Add an optional note about this alert.</p>
              <textarea
                className={styles.noteInput}
                placeholder="e.g. False positive — internal scanner"
                value={ackNote}
                onChange={e => setAckNote(e.target.value)}
                rows={3}
              />
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => { setAcking(null); setAckNote('') }}>Cancel</button>
                <button className={styles.submitBtn} onClick={() => handleAck(acking!)}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
