import styles from './MetricCards.module.css'

interface Props {
  total: number
  anomalyRate: number
  peak: number
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <span className={styles.sub}>{sub}</span>
    </div>
  )
}

export default function MetricCards({ total, anomalyRate, peak }: Props) {
  return (
    <div className={styles.row}>
      <Card
        label="Total Requests"
        value={total.toLocaleString()}
        sub="in selected range"
      />
      <Card
        label="Anomaly Rate"
        value={`${anomalyRate.toFixed(1)}%`}
        sub="suspicious + warning + critical"
      />
      <Card
        label="Peak / Minute"
        value={peak.toString()}
        sub="highest spike in range"
      />
    </div>
  )
}
