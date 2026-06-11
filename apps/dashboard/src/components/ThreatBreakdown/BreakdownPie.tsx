import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { BreakdownItem } from '../../types'
import styles from './BreakdownPie.module.css'

const TYPE_COLOR: Record<string, string> = {
  NORMAL: '#22c55e',
  BRUTE_FORCE: '#ef4444',
  SQL_INJECTION: '#f97316',
  SCANNER: '#eab308',
  PATH_TRAVERSAL: '#8b5cf6',
  BOT: '#64748b',
}
const FALLBACK = '#475569'

interface Props { items: BreakdownItem[] }

export default function BreakdownPie({ items }: Props) {
  if (!items.length) return <div className={styles.empty}>No data</div>
  return (
    <div className={styles.wrap}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={items} dataKey="count" nameKey="threat_type" cx="50%" cy="50%" outerRadius={100} strokeWidth={0}>
            {items.map((item) => (
              <Cell key={item.threat_type} fill={TYPE_COLOR[item.threat_type] ?? FALLBACK} fillOpacity={0.9} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value.toLocaleString()} events`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.legend}>
        {items.map((item) => (
          <div key={item.threat_type} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: TYPE_COLOR[item.threat_type] ?? FALLBACK }} />
            <span className={styles.legendLabel}>{item.threat_type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
