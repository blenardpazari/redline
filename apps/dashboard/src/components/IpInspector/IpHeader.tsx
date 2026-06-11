import type { IpProfile } from '../../types'

function scoreLevel(score: number): { label: string; cls: string } {
  if (score >= 85) return { label: 'CRITICAL',   cls: 'border-crit text-crit' }
  if (score >= 70) return { label: 'WARNING',    cls: 'border-warn text-warn' }
  if (score >= 40) return { label: 'SUSPICIOUS', cls: 'border-sus text-sus' }
  return               { label: 'NORMAL',      cls: 'border-ok text-ok' }
}

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e0 + c.charCodeAt(0) - 65)
  )
}

function fmtDate(ts: string): string {
  return new Date(ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

interface Props { profile: IpProfile }

export default function IpHeader({ profile }: Props) {
  const level = scoreLevel(profile.max_score)
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xl font-semibold">{profile.ip}</span>
          <span className="text-sm text-muted">
            {countryFlag(profile.country)}&nbsp;{profile.country ?? 'Unknown'}
          </span>
        </div>
        <div className="mt-1 text-xs text-dim">
          First {fmtDate(profile.first_seen)} · Last {fmtDate(profile.last_seen)}
        </div>
      </div>
      <div className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-semibold ${level.cls}`}>
        Max {profile.max_score.toFixed(1)} — {level.label}
      </div>
    </div>
  )
}
