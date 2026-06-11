import type { Connector, ConnectorStatus } from '../../types'

const STATUS_BADGE: Record<ConnectorStatus, { label: string; cls: string }> = {
  active:       { label: 'ACTIVE',       cls: 'bg-ok/10 text-ok' },
  inactive:     { label: 'INACTIVE',     cls: 'bg-surface-2 text-dim' },
  unconfigured: { label: 'UNCONFIGURED', cls: 'bg-sus/10 text-sus' },
}

function fmtTime(ts: string | null): string {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

interface Props { connector: Connector }

export default function ConnectorCard({ connector }: Props) {
  const badge = STATUS_BADGE[connector.status]
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{connector.name}</div>
          <div className="font-mono text-[11px] text-dim">{connector.source_type}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{connector.description}</p>
      <div className="mt-3 flex gap-6 border-t border-border pt-3">
        <span className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wide text-dim">Events</span>
          <span className="font-mono text-sm">{connector.total_events.toLocaleString()}</span>
        </span>
        <span className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wide text-dim">Last event</span>
          <span className="font-mono text-sm">{fmtTime(connector.last_event)}</span>
        </span>
      </div>
    </div>
  )
}
