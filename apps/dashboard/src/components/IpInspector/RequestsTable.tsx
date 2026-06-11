import type { LogEntry } from '../../types'
import { LEVEL_ROW_CLASS, LEVEL_TEXT_CLASS } from '../../lib/chartTheme'

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

interface Props { requests: LogEntry[] }

export default function RequestsTable({ requests }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        Last {requests.length} requests
      </div>
      <div className="grid grid-cols-[90px_70px_1fr_60px_60px_120px] gap-2 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-dim">
        <span>Time</span><span>Method</span><span>Path</span>
        <span>Status</span><span>Score</span><span>Type</span>
      </div>
      {requests.map((r) => (
        <div
          key={r.id}
          className={`grid grid-cols-[90px_70px_1fr_60px_60px_120px] gap-2 border-b border-border/60 px-4 py-1.5 font-mono text-xs ${LEVEL_ROW_CLASS[r.threat_level]}`}
        >
          <span className="text-dim">{fmtTime(r.timestamp)}</span>
          <span className="text-muted">{r.method}</span>
          <span className="truncate text-fg">{r.path}</span>
          <span className="text-muted">{r.status_code}</span>
          <span className={`font-medium ${LEVEL_TEXT_CLASS[r.threat_level]}`}>{r.threat_score.toFixed(1)}</span>
          <span className="truncate text-muted">{r.threat_type ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
