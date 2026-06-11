import type { Alert } from '../../types'

function maskIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) return ip
  return `${parts[0]}.${parts[1]}.x.x`
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface Props {
  alert: Alert
}

export default function AlertItem({ alert }: Props) {
  const critical = alert.score >= 85
  return (
    <div
      className={`rounded-md border-l-2 bg-surface-2 px-3 py-2.5 ${
        critical ? 'border-crit' : 'border-warn'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold tracking-wide ${critical ? 'text-crit' : 'text-warn'}`}>
          {alert.threat_type}
        </span>
        <span className={`font-mono text-xs font-semibold ${critical ? 'text-crit' : 'text-warn'}`}>
          {alert.score.toFixed(1)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
        <span>{maskIp(alert.ip)}</span>
        {alert.country !== null && <span>{alert.country}</span>}
        <span className="truncate">{alert.path}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-dim">
        <span>{formatTime(alert.created_at)}</span>
        {alert.email_sent && <span className="text-ok">email sent</span>}
      </div>
    </div>
  )
}
