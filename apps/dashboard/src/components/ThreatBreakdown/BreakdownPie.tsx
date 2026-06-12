import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { BreakdownItem } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, threatTypeColor } from '../../lib/chartTheme'

interface Props { items: BreakdownItem[] }

export default function BreakdownPie({ items }: Props) {
  const { resolved: theme } = useTheme()
  const t = chartTheme(theme === 'dark')

  if (!items.length) {
    return (
      <div className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-border bg-surface text-sm text-dim shadow-sm">
        No data
      </div>
    )
  }

  return (
    <div className="flex-1 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={items}
            dataKey="count"
            nameKey="threat_type"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {items.map((item) => (
              <Cell key={item.threat_type} fill={threatTypeColor(t, item.threat_type)} fillOpacity={0.9} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={t.tooltip}
            formatter={(value: number, name: string) => [`${value.toLocaleString()} events`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <div key={item.threat_type} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: threatTypeColor(t, item.threat_type) }} />
            {item.threat_type}
          </div>
        ))}
      </div>
    </div>
  )
}
