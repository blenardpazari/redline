interface Props {
  total: number
  anomalyRate: number
  peak: number
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-dim">{sub}</div>
    </div>
  )
}

export default function MetricCards({ total, anomalyRate, peak }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
      <Card label="Total Requests" value={total.toLocaleString()} sub="in selected range" />
      <Card label="Anomaly Rate" value={`${anomalyRate.toFixed(1)}%`} sub="suspicious + warning + critical" />
      <Card label="Peak / Minute" value={peak.toString()} sub="highest spike in range" />
    </div>
  )
}
