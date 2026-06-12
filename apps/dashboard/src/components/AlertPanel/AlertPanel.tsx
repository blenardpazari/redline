import type { Alert } from '../../types'
import AlertItem from './AlertItem'

interface Props {
  alerts: Alert[]
  bare?: boolean
}

export default function AlertPanel({ alerts, bare }: Props) {
  const inner = (
    <div className="max-h-[420px] flex-1 space-y-2 overflow-y-auto p-3">
      {alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-dim">No active alerts</p>
      ) : (
        alerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
      )}
    </div>
  )

  if (bare) return inner
  return (
    <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium">Alerts</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">{alerts.length}</span>
      </div>
      {inner}
    </div>
  )
}
