import styles from './BottomStats.module.css'

interface Props {
  topPath: string | null | undefined
  topIp: string | null | undefined
  busiestHour: number | null | undefined
}

function maskIp(ip: string): string {
  const p = ip.split('.')
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : ip
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  )
}

export default function BottomStats({ topPath, topIp, busiestHour }: Props) {
  return (
    <div className={styles.row}>
      <Card label="Most Targeted Path" value={topPath ?? '—'} />
      <Card label="Most Active Attacker" value={topIp ? maskIp(topIp) : '—'} />
      <Card
        label="Busiest Attack Hour"
        value={busiestHour != null ? `${String(busiestHour).padStart(2, '0')}:00` : '—'}
      />
    </div>
  )
}
