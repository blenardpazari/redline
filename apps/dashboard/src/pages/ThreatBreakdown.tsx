import { useEffect, useState } from 'react'
import BottomStats from '../components/ThreatBreakdown/BottomStats'
import BreakdownPie from '../components/ThreatBreakdown/BreakdownPie'
import RankedList from '../components/ThreatBreakdown/RankedList'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { ThreatBreakdownResponse } from '../types'
import styles from './ThreatBreakdown.module.css'

type Range = '24h' | '7d' | '30d'
const RANGES: Range[] = ['24h', '7d', '30d']

export default function ThreatBreakdown() {
  const [range, setRange] = useState<Range>('24h')
  const [data, setData] = useState<ThreatBreakdownResponse | null>(null)

  useEffect(() => {
    api.get<ThreatBreakdownResponse>(`/stats?range=${range}`)
      .then(setData)
      .catch(() => undefined)
  }, [range])

  const items = data?.breakdown ?? []

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Threat Breakdown</h1>
          <div className={styles.ranges}>
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`${styles.rangeBtn}${range === r ? ` ${styles.active}` : ''}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.main}>
          <BreakdownPie items={items} />
          <RankedList items={items} />
        </div>
        <BottomStats topPath={data?.top_path} topIp={data?.top_ip} busiestHour={data?.busiest_hour} />
      </div>
    </Layout>
  )
}
