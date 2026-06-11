import type { IpProfile } from '../../types'

function hoursActive(first: string, last: string): number {
  return Math.max(1, Math.round((new Date(last).getTime() - new Date(first).getTime()) / 3_600_000))
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

interface Props { profile: IpProfile }

export default function IpStats({ profile }: Props) {
  return (
    <div className="flex gap-4">
      <StatCard label="Total Requests" value={profile.total_requests.toLocaleString()} />
      <StatCard label="Avg Score"      value={profile.avg_score.toFixed(1)} />
      <StatCard label="Threat Types"   value={profile.threat_types.length.toString()} />
      <StatCard label="Hours Active"   value={hoursActive(profile.first_seen, profile.last_seen).toString()} />
    </div>
  )
}
