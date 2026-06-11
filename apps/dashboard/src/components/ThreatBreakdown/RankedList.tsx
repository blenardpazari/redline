import type { BreakdownItem } from '../../types'
import styles from './RankedList.module.css'

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

export default function RankedList({ items }: Props) {
  if (!items.length) return <div className={styles.empty}>No data</div>
  return (
    <div className={styles.wrap}>
      {items.map((item, i) => (
        <div key={item.threat_type} className={styles.row}>
          <span className={styles.rank}>#{i + 1}</span>
          <div className={styles.info}>
            <div className={styles.top}>
              <span className={styles.type}>{item.threat_type}</span>
              <span className={styles.meta}>{item.count.toLocaleString()} events</span>
              <span className={styles.pct}>{item.percent.toFixed(1)}%</span>
            </div>
            <div className={styles.barBg}>
              <div
                className={styles.bar}
                style={{ width: `${item.percent}%`, background: TYPE_COLOR[item.threat_type] ?? FALLBACK }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
