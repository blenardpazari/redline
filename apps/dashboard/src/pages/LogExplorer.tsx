import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FilterBar, { type Filters } from '../components/LogExplorer/FilterBar'
import ResultsTable from '../components/LogExplorer/ResultsTable'
import Layout from '../components/Layout/Layout'
import { IconDownload } from '../components/ui/icons'
import { useServer } from '../context/ServerContext'
import { useDebounce } from '../hooks/useDebounce'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import type { LogEntry, LogSearchResponse, WebSocketMessage } from '../types'

type SortField = 'timestamp' | 'threat_score' | 'status_code'
type SortOrder = 'asc' | 'desc'

function exportCsv(entries: LogEntry[]) {
  const header = 'time,ip,method,path,status,score,threat\n'
  const rows = entries.map((e) =>
    `${e.timestamp},${e.ip},${e.method},"${e.path.replace(/"/g, '""')}",${e.status_code},${e.threat_score},${e.threat_level}`
  ).join('\n')
  const url = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'redline-logs.csv'; a.click()
  URL.revokeObjectURL(url)
}

function isFiltered(filters: Filters) {
  return !!(filters.q || filters.threatLevel || filters.status || filters.from || filters.to)
}

export default function LogExplorer() {
  const { token } = useAuth()
  const { selectedServerId } = useServer()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<Filters>({
    q: searchParams.get('q') ?? '',
    threatLevel: searchParams.get('threat_level') ?? '',
    status: searchParams.get('status') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
  })
  const [sort, setSort] = useState<SortField>('timestamp')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<LogSearchResponse | null>(null)
  const [newCount, setNewCount] = useState(0)
  const debouncedQ = useDebounce(filters.q, 300)

  const filtered = isFiltered(filters)
  const isLive = !filtered && sort === 'timestamp' && order === 'desc' && page === 1

  useEffect(() => { setPage(1); setNewCount(0) }, [debouncedQ, filters.threatLevel, filters.status, filters.from, filters.to, sort, order, selectedServerId])

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), limit: '50', sort, order })
    if (debouncedQ) p.set('q', debouncedQ)
    if (filters.threatLevel) p.set('threat_level', filters.threatLevel)
    if (filters.status) p.set('status', filters.status)
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    if (selectedServerId) p.set('server_id', String(selectedServerId))
    api.get<LogSearchResponse>(`/logs/search?${p}`).then(d => { setData(d); setNewCount(0) }).catch(() => undefined)
  }, [debouncedQ, filters.threatLevel, filters.status, filters.from, filters.to, sort, order, page, selectedServerId])

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type !== 'log_entry') return
    const entry: LogEntry = msg.data
    if (isLive) {
      setData(prev => {
        if (!prev) return prev
        const entries = [entry, ...prev.entries].slice(0, 50)
        return { ...prev, entries, total: prev.total + 1 }
      })
    } else {
      setNewCount(n => n + 1)
    }
  }, [isLive])

  useWebSocket(handleMessage, token)

  function handleSort(field: SortField) {
    if (field === sort) setOrder((o) => o === 'asc' ? 'desc' : 'asc')
    else { setSort(field); setOrder('desc') }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex w-full items-center justify-between sm:w-auto">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight">Log Explorer</h1>
              {isLive && (
                <span className="flex items-center gap-1.5 rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-medium text-ok">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
                  </span>
                  Live
                </span>
              )}
            </div>
            {data && data.entries.length > 0 && (
              <button
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg sm:hidden"
                onClick={() => exportCsv(data.entries)}
              >
                <IconDownload size={14} /> Export CSV
              </button>
            )}
          </div>
          <p className="w-full text-sm text-muted sm:hidden">Search, filter, and export request logs</p>
          <div className="hidden items-center gap-2 sm:flex">
            <p className="text-sm text-muted">Search, filter, and export request logs</p>
            {data && data.entries.length > 0 && (
              <button
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
                onClick={() => exportCsv(data.entries)}
              >
                <IconDownload size={14} /> Export CSV
              </button>
            )}
          </div>
        </div>
        <FilterBar filters={filters} onChange={(f) => setFilters(f)} />
        {newCount > 0 && (
          <button
            onClick={() => { setPage(1); setSort('timestamp'); setOrder('desc'); setNewCount(0) }}
            className="w-full rounded-lg border border-ok/30 bg-ok/10 py-2 text-sm font-medium text-ok transition-colors hover:bg-ok/20"
          >
            ↑ {newCount} new {newCount === 1 ? 'entry' : 'entries'} — click to refresh
          </button>
        )}
        {data && (
          <ResultsTable
            entries={data.entries}
            total={data.total}
            page={page}
            limit={50}
            sort={sort}
            order={order}
            onSort={handleSort}
            onPage={setPage}
          />
        )}
      </div>
    </Layout>
  )
}
