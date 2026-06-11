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
    <div className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 truncate font-mono text-base font-medium">{value}</div>
    </div>
  )
}

export default function BottomStats({ topPath, topIp, busiestHour }: Props) {
  return (
    <div className="flex gap-4">
      <Card label="Most Targeted Path" value={topPath ?? '—'} />
      <Card label="Most Active Attacker" value={topIp ? maskIp(topIp) : '—'} />
      <Card
        label="Busiest Attack Hour"
        value={busiestHour != null ? `${String(busiestHour).padStart(2, '0')}:00` : '—'}
      />
    </div>
  )
}
