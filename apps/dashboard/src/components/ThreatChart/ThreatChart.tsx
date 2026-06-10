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
import styles from './ThreatChart.module.css'

const TOOLTIP_STYLE = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 0,
  fontSize: 12,
  fontFamily: 'JetBrains Mono, monospace',
}

const TICK_STYLE = {
  fill: '#64748b',
  fontSize: 11,
  fontFamily: 'JetBrains Mono, monospace',
}

interface Props {
  data: ChartDataPoint[]
}

export default function ThreatChart({ data }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>Threat Activity — 60 min</div>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#64748b' }}
            />
            <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 4" label="Redline" />
            <Line
              type="monotone"
              dataKey="normal"
              stroke="#22c55e"
              strokeWidth={1.5}
              dot={false}
              name="Normal"
            />
            <Line
              type="monotone"
              dataKey="anomaly"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={false}
              name="Anomaly"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
