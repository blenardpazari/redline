import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartDataPoint } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme } from '../../lib/chartTheme'

interface Props {
  data: ChartDataPoint[]
}

export default function ThreatChart({ data }: Props) {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        Threat Activity — 60 min
      </div>
      <div className="h-56 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={t.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="time" tick={t.tick} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={t.tick} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={t.tooltip} labelStyle={t.tooltipLabel} />
            <ReferenceLine y={85} stroke={t.crit} strokeDasharray="4 4" label={{ value: 'Redline', fill: t.crit, fontSize: 10 }} />
            <Line type="monotone" dataKey="normal" stroke={t.ok} strokeWidth={1.5} dot={false} name="Normal" />
            <Line type="monotone" dataKey="anomaly" stroke={t.crit} strokeWidth={1.5} dot={false} name="Anomaly" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
