import { useNavigate } from 'react-router-dom'

interface Props {
  topPath: string | null | undefined
  topIp: string | null | undefined
  busiestHour: number | null | undefined
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 truncate font-mono text-base font-medium">{children}</div>
    </div>
  )
}

export default function BottomStats({ topPath, topIp, busiestHour }: Props) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
      <Card label="Most Targeted Path">{topPath ?? '—'}</Card>
      <Card label="Most Active Attacker">
        {topIp
          ? <span className="cursor-pointer underline-offset-2 hover:text-accent hover:underline" onClick={() => navigate(`/ip/${topIp}`)}>{topIp}</span>
          : '—'}
      </Card>
      <Card label="Busiest Attack Hour">
        {busiestHour != null ? `${String(busiestHour).padStart(2, '0')}:00` : '—'}
      </Card>
    </div>
  )
}
