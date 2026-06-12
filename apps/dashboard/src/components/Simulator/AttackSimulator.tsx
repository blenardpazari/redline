import { useEffect, useRef, useState } from 'react'
import { getToken } from '../../lib/token'

const BASE = import.meta.env.VITE_API_URL

interface Profile {
  label: string
  description: string
}

interface LogLine {
  i?: number
  total?: number
  ip?: string
  path?: string
  score?: number
  level?: string
  alerted?: boolean
  error?: string
  done?: boolean
  meta?: string
}

const LEVEL_COLOR: Record<string, string> = {
  critical:   '#f0314b',
  warning:    '#f59e0b',
  suspicious: '#a78bfa',
  normal:     '#22c55e',
}

const ATTACK_ICONS: Record<string, string> = {
  ddos:          '⚡',
  brute_force:   '🔑',
  path_scan:     '🔍',
  sql_injection: '💉',
  xss:           '🕷',
  mixed:         '💀',
}

interface Props {
  onClose: () => void
}

export default function AttackSimulator({ onClose }: Props) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [selected, setSelected] = useState('ddos')
  const [count, setCount] = useState(30)
  const [intervalMs, setIntervalMs] = useState(300)
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<LogLine[]>([])
  const [height, setHeight] = useState(380)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  useEffect(() => {
    fetch(`${BASE}/simulate/profiles`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(setProfiles)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function pushLine(line: LogLine) {
    setLines(prev => [...prev.slice(-300), line])
  }

  async function start() {
    if (running) return
    setRunning(true)
    setLines([])
    pushLine({ meta: `Starting ${profiles[selected]?.label ?? selected} — ${count} requests @ ${intervalMs}ms interval` })

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch(`${BASE}/simulate/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ attack_type: selected, count, interval_ms: intervalMs }),
        signal: ctrl.signal,
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data: LogLine = JSON.parse(line.slice(6))
            pushLine(data)
            if (data.done) break
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') pushLine({ meta: `Error: ${e?.message}` })
    } finally {
      setRunning(false)
    }
  }

  function stop() {
    abortRef.current?.abort()
    setRunning(false)
    pushLine({ meta: '— Simulation stopped —' })
  }

  // drag-to-resize
  function onDragStart(e: React.MouseEvent) {
    dragRef.current = { startY: e.clientY, startH: height }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - ev.clientY
      setHeight(Math.max(200, Math.min(800, dragRef.current.startH + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const progress = lines.filter(l => l.i !== undefined).length
  const total = lines.find(l => l.total !== undefined)?.total ?? count
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[2000] flex flex-col border-t border-border bg-[#0d1117] font-mono shadow-2xl"
      style={{ height }}
    >
      {/* drag handle */}
      <div
        className="flex h-1.5 cursor-ns-resize items-center justify-center bg-border/40 hover:bg-accent/40 transition-colors"
        onMouseDown={onDragStart}
      >
        <div className="h-0.5 w-12 rounded-full bg-border-strong" />
      </div>

      {/* title bar */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          ⚡ Attack Simulator
        </span>
        {running && (
          <span className="flex items-center gap-1.5 text-[11px] text-warn">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warn" />
            </span>
            LIVE — {pct}%
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={running ? stop : start}
            className={`rounded px-3 py-1 text-[11px] font-semibold transition-colors ${
              running
                ? 'bg-crit/20 text-crit hover:bg-crit/30'
                : 'bg-accent/20 text-accent hover:bg-accent/30'
            }`}
          >
            {running ? '■ Stop' : '▶ Run'}
          </button>
          <button
            onClick={onClose}
            className="text-dim hover:text-fg transition-colors text-lg leading-none px-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* left panel — controls */}
        <div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/60 p-3">
          {/* attack type */}
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-dim">Attack Type</div>
            <div className="space-y-1">
              {Object.entries(profiles).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => !running && setSelected(key)}
                  disabled={running}
                  className={`w-full rounded px-2.5 py-1.5 text-left text-[11px] transition-colors disabled:opacity-50 ${
                    selected === key
                      ? 'bg-accent/20 text-accent'
                      : 'text-muted hover:bg-white/5 hover:text-fg'
                  }`}
                >
                  <span className="mr-1.5">{ATTACK_ICONS[key] ?? '•'}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* count */}
          <div>
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-dim">
              <span>Requests</span>
              <span className="text-fg">{count}</span>
            </div>
            <input
              type="range" min={5} max={200} step={5} value={count}
              onChange={e => setCount(Number(e.target.value))}
              disabled={running}
              className="w-full accent-[#f0314b] disabled:opacity-50"
            />
          </div>

          {/* interval */}
          <div>
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-dim">
              <span>Interval</span>
              <span className="text-fg">{intervalMs}ms</span>
            </div>
            <input
              type="range" min={100} max={2000} step={100} value={intervalMs}
              onChange={e => setIntervalMs(Number(e.target.value))}
              disabled={running}
              className="w-full accent-[#f0314b] disabled:opacity-50"
            />
          </div>

          {selected && profiles[selected] && (
            <div className="rounded border border-border/40 bg-white/[0.03] p-2 text-[11px] text-dim leading-relaxed">
              {profiles[selected].description}
            </div>
          )}

          {running && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-widest text-dim">Progress</div>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-accent transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-dim">{progress} / {total}</div>
            </div>
          )}
        </div>

        {/* right panel — terminal output */}
        <div className="flex-1 overflow-y-auto p-3 text-[11px] leading-5">
          {lines.length === 0 && (
            <div className="text-dim">
              <span className="text-accent">$</span> Select an attack type and press Run…
            </div>
          )}
          {lines.map((l, i) => {
            if (l.meta) {
              return (
                <div key={i} className="text-dim italic">
                  <span className="text-accent mr-2">$</span>{l.meta}
                </div>
              )
            }
            if (l.done) {
              return <div key={i} className="text-ok mt-1">✓ Simulation complete.</div>
            }
            if (l.error) {
              return <div key={i} className="text-crit">✗ {l.error}</div>
            }
            const color = LEVEL_COLOR[l.level ?? ''] ?? '#6b7280'
            return (
              <div key={i} className="flex gap-2">
                <span className="text-dim w-8 shrink-0 text-right">{l.i}</span>
                <span className="text-dim shrink-0">→</span>
                <span className="shrink-0 w-28 truncate text-[#8b9eb0]">{l.ip}</span>
                <span className="shrink-0 flex-1 min-w-0 truncate text-[#6b7280]">{l.path}</span>
                <span className="shrink-0" style={{ color }}>{l.level}</span>
                <span className="shrink-0 w-8 text-right" style={{ color }}>{l.score}</span>
                {l.alerted && <span className="shrink-0 text-warn">🔔</span>}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
