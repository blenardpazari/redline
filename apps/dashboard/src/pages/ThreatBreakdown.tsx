import { useEffect, useState } from 'react'
import BottomStats from '../components/ThreatBreakdown/BottomStats'
import BreakdownPie from '../components/ThreatBreakdown/BreakdownPie'
import RankedList from '../components/ThreatBreakdown/RankedList'
import Layout from '../components/Layout/Layout'
import { useServer } from '../context/ServerContext'
import { api } from '../lib/api'
import type { ThreatBreakdownResponse } from '../types'

type Range = '24h' | '7d' | '30d'
const RANGES: Range[] = ['24h', '7d', '30d']

export default function ThreatBreakdown() {
  const { selectedServerId } = useServer()
  const [range, setRange] = useState<Range>('24h')
  const [data, setData] = useState<ThreatBreakdownResponse | null>(null)

  useEffect(() => {
    const sid = selectedServerId ? `&server_id=${selectedServerId}` : ''
    api.get<ThreatBreakdownResponse>(`/stats?range=${range}${sid}`)
      .then(setData)
      .catch(() => undefined)
  }, [range, selectedServerId])

  const items = data?.breakdown ?? []

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Threat Breakdown</h1>
            <p className="text-sm text-muted">Distribution of detected threat types</p>
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
        <div className="flex flex-col gap-4 md:flex-row">
          <BreakdownPie items={items} />
          <RankedList items={items} />
        </div>
        <BottomStats topPath={data?.top_path} topIp={data?.top_ip} busiestHour={data?.busiest_hour} />
      </div>
    </Layout>
  )
}
