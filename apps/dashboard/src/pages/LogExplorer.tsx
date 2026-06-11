import { useEffect, useState } from 'react'
import FilterBar, { type Filters } from '../components/LogExplorer/FilterBar'
import ResultsTable from '../components/LogExplorer/ResultsTable'
import Layout from '../components/Layout/Layout'
import { useServer } from '../context/ServerContext'
import { useDebounce } from '../hooks/useDebounce'
import { api } from '../lib/api'
import type { LogEntry, LogSearchResponse } from '../types'
import styles from './LogExplorer.module.css'

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

export default function LogExplorer() {
  const { selectedServerId } = useServer()
  const [filters, setFilters] = useState<Filters>({ q: '', threatLevel: '', status: '', from: '', to: '' })
  const [sort, setSort] = useState<SortField>('timestamp')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<LogSearchResponse | null>(null)
  const debouncedQ = useDebounce(filters.q, 300)

  useEffect(() => { setPage(1) }, [debouncedQ, filters.threatLevel, filters.status, filters.from, filters.to, sort, order, selectedServerId])

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), limit: '50', sort, order })
    if (debouncedQ) p.set('q', debouncedQ)
    if (filters.threatLevel) p.set('threat_level', filters.threatLevel)
    if (filters.status) p.set('status', filters.status)
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
    if (selectedServerId) p.set('server_id', String(selectedServerId))
    api.get<LogSearchResponse>(`/logs/search?${p}`).then(setData).catch(() => undefined)
  }, [debouncedQ, filters.threatLevel, filters.status, filters.from, filters.to, sort, order, page, selectedServerId])

  function handleSort(field: SortField) {
    if (field === sort) setOrder((o) => o === 'asc' ? 'desc' : 'asc')
    else { setSort(field); setOrder('desc') }
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Log Explorer</h1>
          {data && data.entries.length > 0 && (
            <button className={styles.export} onClick={() => exportCsv(data.entries)}>Export CSV</button>
          )}
        </div>
        <FilterBar filters={filters} onChange={(f) => setFilters(f)} />
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
