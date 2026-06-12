import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import type { AnalyticsPoint } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, type ChartTheme } from '../../lib/chartTheme'

interface Props {
  points: AnalyticsPoint[]
  range: string
}

function barColor(p: AnalyticsPoint, t: ChartTheme): string {
  if (p.critical > 0) return t.crit
  if (p.anomaly > 0 && p.anomaly >= p.normal * 0.1) return t.sus
  return t.ok
}

export default function BarBreakdown({ points, range }: Props) {
  const { resolved: theme } = useTheme()
  const t = chartTheme(theme === 'dark')
  const data = points.map((p) => ({ ...p, total: p.normal + p.anomaly + p.critical }))
  const label = range === '24h' ? 'Requests per hour' : 'Requests per day'

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <span className="mb-3 block text-sm font-medium">{label}</span>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis dataKey="label" tick={t.tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={t.tick} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={t.tooltip} labelStyle={t.tooltipLabel} cursor={{ fill: t.grid }} />
          <Bar dataKey="total" name="Requests" radius={[3, 3, 0, 0]}>
            {data.map((p, i) => (
              <Cell key={i} fill={barColor(p, t)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
