import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import type { LogEntry, ThreatLevel } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, levelColor } from '../../lib/chartTheme'

interface Point { time: string; score: number; level: ThreatLevel }

interface DotProps { cx: number; cy: number; payload: Point }

interface Props { requests: LogEntry[] }

export default function ScoreTimeline({ requests }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = chartTheme(dark)

  const data: Point[] = [...requests].reverse().map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    score: r.threat_score,
    level: r.threat_level,
  }))

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <span className="mb-3 block text-sm font-medium">Score timeline</span>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis dataKey="time" tick={t.tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={t.tick} axisLine={false} tickLine={false} width={32} />
          <Tooltip contentStyle={t.tooltip} labelStyle={t.tooltipLabel} />
          <ReferenceLine y={85} stroke={t.crit} strokeDasharray="4 2" strokeOpacity={0.6}
            label={{ value: 'Redline', fill: t.crit, fontSize: 10, position: 'insideTopRight' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke={dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.15)'}
            strokeWidth={1}
            dot={(p: DotProps) => (
              <circle key={`${p.cx}-${p.cy}`} cx={p.cx} cy={p.cy} r={3} fill={levelColor(t, p.payload.level)} stroke="none" />
            )}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
