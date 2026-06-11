import type { LogEntry } from '../../types'
import LogRow from './LogRow'

interface Props {
  entries: LogEntry[]
}

export default function LiveFeed({ entries }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
          </span>
          Live Feed
        </span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">{entries.length}</span>
      </div>
      <div className="max-h-[420px] flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-dim">Waiting for events…</p>
        ) : (
          entries.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}
