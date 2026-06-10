import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Stats } from '../../types'
import styles from './StatsBar.module.css'

function Stat({
  label,
  value,
  color = 'var(--text)',
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.value} style={{ color }}>
        {value.toLocaleString()}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats>({
    requests_today: 0,
    anomalies_today: 0,
    redlines_today: 0,
  })

  useEffect(() => {
    function fetchStats() {
      api.get<Stats>('/stats').then(setStats).catch(() => undefined)
    }
    fetchStats()
    const id = setInterval(fetchStats, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.bar}>
      <Stat label="Requests Today" value={stats.requests_today} />
      <Stat label="Anomalies" value={stats.anomalies_today} color="var(--suspicious)" />
      <Stat label="Redlines Crossed" value={stats.redlines_today} color="var(--critical)" />
    </div>
  )
}
