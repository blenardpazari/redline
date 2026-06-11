import type { BreakdownItem } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, threatTypeColor } from '../../lib/chartTheme'

interface Props { items: BreakdownItem[] }

export default function RankedList({ items }: Props) {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')

  if (!items.length) {
    return (
      <div className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-border bg-surface text-sm text-dim shadow-sm">
        No data
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      {items.map((item, i) => (
        <div key={item.threat_type} className="flex items-start gap-3">
          <span className="mt-0.5 w-7 shrink-0 font-mono text-xs text-dim">#{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{item.threat_type}</span>
              <span className="text-xs text-muted">{item.count.toLocaleString()} events</span>
              <span className="ml-auto font-mono text-xs text-muted">{item.percent.toFixed(1)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${item.percent}%`, background: threatTypeColor(t, item.threat_type) }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
