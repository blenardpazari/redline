import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import Checkbox from '../components/ui/Checkbox'
import { api } from '../lib/api'
import { useServer } from '../context/ServerContext'
import { useTheme } from '../context/ThemeContext'
import { chartTheme, scoreTextClass, threatTypeColor } from '../lib/chartTheme'
import type { AlertsFullResponse } from '../types'

export default function AlertHistory() {
  const { selectedServerId } = useServer()
  const { resolved: theme } = useTheme()
  const t = chartTheme(theme === 'dark')
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

  const thCls = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-dim'
  const tdCls = 'px-3 py-2 text-sm'

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Alert History</h1>
            <p className="text-sm text-muted">All triggered alerts with acknowledgement workflow</p>
          </div>
          <Checkbox
            checked={unackedOnly}
            onChange={setUnackedOnly}
            label="Unacknowledged only"
          />
        </div>

        {data && (
          <p className="text-xs text-dim">{data.total} alerts{unackedOnly ? ' unacknowledged' : ''}</p>
        )}

        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className={thCls}>Time</th><th className={thCls}>IP</th><th className={thCls}>Country</th>
                <th className={thCls}>Threat</th><th className={thCls}>Score</th><th className={thCls}>Path</th>
                <th className={thCls}>Email</th><th className={thCls}>Status</th><th className={thCls}></th>
              </tr>
            </thead>
            <tbody>
              {data?.alerts.map(a => (
                <tr key={a.id} className={`border-b border-border/60 ${a.acked_at ? 'opacity-55' : ''}`}>
                  <td className={`${tdCls} whitespace-nowrap font-mono text-xs text-muted`}>{new Date(a.created_at).toLocaleString()}</td>
                  <td className={`${tdCls} font-mono text-xs`}>{a.ip}</td>
                  <td className={tdCls}>{a.country ?? '—'}</td>
                  <td className={tdCls}>
                    <span className="text-xs font-semibold" style={{ color: threatTypeColor(t, a.threat_type) }}>
                      {a.threat_type}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className={`font-mono text-xs font-semibold ${scoreTextClass(a.score)}`}>
                      {a.score.toFixed(1)}
                    </span>
                  </td>
                  <td className={`${tdCls} max-w-52 truncate font-mono text-xs text-muted`}>{a.path}</td>
                  <td className={tdCls}>{a.email_sent ? '✉️' : '—'}</td>
                  <td className={tdCls}>
                    {a.acked_at
                      ? <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-medium text-ok" title={`by ${a.acked_by}${a.ack_note ? `: ${a.ack_note}` : ''}`}>✓ Acked</span>
                      : <span className="rounded-full bg-sus/10 px-2 py-0.5 text-[11px] font-medium text-sus">Pending</span>}
                  </td>
                  <td className={tdCls}>
                    {!a.acked_at && (
                      <button
                        className="rounded border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:border-border-strong hover:text-fg"
                        onClick={() => setAcking(a.id)}
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data && data.alerts.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-dim">No alerts</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > 50 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-border-strong enabled:hover:text-fg disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs text-muted">Page {page} of {Math.ceil(data.total / 50)}</span>
            <button
              disabled={page >= Math.ceil(data.total / 50)}
              onClick={() => setPage(p => p + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors enabled:hover:border-border-strong enabled:hover:text-fg disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}

        {acking !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => { setAcking(null); setAckNote('') }}>
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-semibold">Acknowledge Alert</h2>
              <p className="mb-3 mt-1 text-sm text-muted">Add an optional note about this alert.</p>
              <textarea
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent"
                placeholder="e.g. False positive — internal scanner"
                value={ackNote}
                onChange={e => setAckNote(e.target.value)}
                rows={3}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-md border border-border px-3.5 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg"
                  onClick={() => { setAcking(null); setAckNote('') }}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                  onClick={() => handleAck(acking!)}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
