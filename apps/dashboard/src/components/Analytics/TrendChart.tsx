import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import type { AnalyticsPoint } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme } from '../../lib/chartTheme'

interface Props {
  points: AnalyticsPoint[]
  range: string
}

export default function TrendChart({ points, range }: Props) {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <span className="mb-3 block text-sm font-medium">Traffic over time — {range}</span>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gNorm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={t.ok} stopOpacity={0.25} />
              <stop offset="95%" stopColor={t.ok} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={t.sus} stopOpacity={0.25} />
              <stop offset="95%" stopColor={t.sus} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={t.crit} stopOpacity={0.3} />
              <stop offset="95%" stopColor={t.crit} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis dataKey="label" tick={t.tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={t.tick} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={t.tooltip} labelStyle={t.tooltipLabel} />
          <ReferenceLine y={0} stroke={t.grid} />
          <Area type="monotone" dataKey="normal"   name="Normal"   stroke={t.ok}   fill="url(#gNorm)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="anomaly"  name="Anomaly"  stroke={t.sus}  fill="url(#gAnom)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="critical" name="Critical" stroke={t.crit} fill="url(#gCrit)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
