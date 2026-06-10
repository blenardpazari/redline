import type { LogEntry } from '../../types'
import LogRow from './LogRow'
import styles from './LiveFeed.module.css'

interface Props {
  entries: LogEntry[]
}

export default function LiveFeed({ entries }: Props) {
  return (
    <div className={styles.feed}>
      <div className={styles.header}>
        <span>Live Feed</span>
        <span className={styles.count}>{entries.length}</span>
      </div>
      <div className={styles.rows}>
        {entries.map((entry) => (
          <LogRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
