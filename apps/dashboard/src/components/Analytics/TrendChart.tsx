import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import type { AnalyticsPoint } from '../../types'
import styles from './TrendChart.module.css'

interface Props {
  points: AnalyticsPoint[]
  range: string
}

const TOOLTIP_STYLE = {
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 4,
  fontSize: 12,
}

export default function TrendChart({ points, range }: Props) {
  return (
    <div className={styles.wrap}>
      <span className={styles.title}>Traffic over time — {range}</span>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gNorm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#eab308" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f4' }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
          <Area type="monotone" dataKey="normal"   name="Normal"   stroke="#22c55e" fill="url(#gNorm)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="anomaly"  name="Anomaly"  stroke="#eab308" fill="url(#gAnom)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" fill="url(#gCrit)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
