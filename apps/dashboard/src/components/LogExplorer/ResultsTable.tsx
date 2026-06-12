import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExplainModal from '../ExplainModal/ExplainModal'
import type { LogEntry } from '../../types'
import { LEVEL_ROW_CLASS, LEVEL_TEXT_CLASS } from '../../lib/chartTheme'

type SortField = 'timestamp' | 'threat_score' | 'status_code'
type SortOrder = 'asc' | 'desc'

interface Props {
  entries: LogEntry[]
  total: number
  page: number
  limit: number
  sort: SortField
  order: SortOrder
  onSort: (field: SortField) => void
  onPage: (p: number) => void
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const GRID = 'grid grid-cols-[90px_120px_70px_1fr_70px_60px_100px_80px] gap-2 px-4'

export default function ResultsTable({ entries, total, page, limit, sort, order, onSort, onPage }: Props) {
  const navigate = useNavigate()
  const [explainId, setExplainId] = useState<number | null>(null)
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  function th(label: string, field: SortField) {
    const active = sort === field
    return (
      <span
        className={`cursor-pointer select-none transition-colors hover:text-fg ${active ? 'text-accent' : ''}`}
        onClick={() => onSort(field)}
      >
        {label}{active ? (order === 'asc' ? ' ↑' : ' ↓') : ''}
      </span>
    )
  }

  return (
    <>
    {explainId !== null && <ExplainModal logId={explainId} onClose={() => setExplainId(null)} />}
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
      <div className={`${GRID} border-b border-border py-2.5 text-[11px] font-semibold uppercase tracking-wide text-dim`}>
        {th('Time', 'timestamp')}<span>IP</span>
        <span>Method</span><span>Path</span>
        {th('Status', 'status_code')}{th('Score', 'threat_score')}
        <span>Threat</span><span />
      </div>
      {entries.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-dim">No matching entries</p>
      )}
      {entries.map((e) => (
        <div key={e.id} className={`group ${GRID} items-center border-b border-border/60 py-1.5 font-mono text-xs ${LEVEL_ROW_CLASS[e.threat_level]}`}>
          <span className="text-dim">{fmtTime(e.timestamp)}</span>
          <span
            className="cursor-pointer text-fg underline-offset-2 hover:text-accent hover:underline"
            onClick={() => navigate(`/ip/${e.ip}`)}
          >
            {e.ip}
          </span>
          <span className="text-muted">{e.method}</span>
          <span className="truncate text-muted">{e.path}</span>
          <span className="text-muted">{e.status_code}</span>
          <span className={`font-medium ${LEVEL_TEXT_CLASS[e.threat_level]}`}>{e.threat_score.toFixed(1)}</span>
          <span className="text-muted">{e.threat_level}</span>
          <button
            onClick={() => setExplainId(e.id)}
            className="cursor-pointer flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-sans font-medium text-muted transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent"
          >
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            Why?
          </button>
        </div>
      ))}
      </div>{/* end overflow-x-auto */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs text-muted">
          Showing {total === 0 ? 0 : from}–{to} of {total.toLocaleString()} entries
        </span>
        <div className="flex items-center gap-3">
          <button
            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors enabled:hover:border-border-strong enabled:hover:text-fg disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            ← Prev
          </button>
          <span className="text-xs text-muted">Page {page} of {pages}</span>
          <button
            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors enabled:hover:border-border-strong enabled:hover:text-fg disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
