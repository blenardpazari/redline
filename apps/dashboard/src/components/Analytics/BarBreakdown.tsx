import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import type { AnalyticsPoint } from '../../types'
import styles from './BarBreakdown.module.css'

interface Props {
  points: AnalyticsPoint[]
  range: string
}

function barColor(p: AnalyticsPoint): string {
  if (p.critical > 0) return '#ef4444'
  if (p.anomaly > 0 && p.anomaly >= p.normal * 0.1) return '#eab308'
  return '#22c55e'
}

export default function BarBreakdown({ points, range }: Props) {
  const data = points.map((p) => ({ ...p, total: p.normal + p.anomaly + p.critical }))
  const label = range === '24h' ? 'Requests per hour' : 'Requests per day'

  return (
    <div className={styles.wrap}>
      <span className={styles.title}>{label}</span>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, fontSize: 12 }}
            labelStyle={{ color: '#e2e8f4' }}
          />
          <Bar dataKey="total" name="Requests" radius={[2, 2, 0, 0]}>
            {data.map((p, i) => (
              <Cell key={i} fill={barColor(p)} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
