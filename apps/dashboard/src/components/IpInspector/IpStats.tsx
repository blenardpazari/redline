import type { IpProfile } from '../../types'
import styles from './IpStats.module.css'

function hoursActive(first: string, last: string): number {
  return Math.max(1, Math.round((new Date(last).getTime() - new Date(first).getTime()) / 3_600_000))
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  )
}

interface Props { profile: IpProfile }

export default function IpStats({ profile }: Props) {
  return (
    <div className={styles.row}>
      <StatCard label="Total Requests" value={profile.total_requests.toLocaleString()} />
      <StatCard label="Avg Score"      value={profile.avg_score.toFixed(1)} />
      <StatCard label="Threat Types"   value={profile.threat_types.length.toString()} />
      <StatCard label="Hours Active"   value={hoursActive(profile.first_seen, profile.last_seen).toString()} />
    </div>
  )
}
