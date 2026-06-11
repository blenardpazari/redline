import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import type { LogEntry, ThreatLevel } from '../../types'
import styles from './ScoreTimeline.module.css'

const LEVEL_COLOR: Record<ThreatLevel, string> = {
  normal: '#22c55e', suspicious: '#eab308', warning: '#f97316', critical: '#ef4444',
}

interface Point { time: string; score: number; level: ThreatLevel }

interface DotProps { cx: number; cy: number; payload: Point }

function ScoreDot({ cx, cy, payload }: DotProps) {
  return <circle cx={cx} cy={cy} r={3} fill={LEVEL_COLOR[payload.level]} stroke="none" />
}

const TOOLTIP_STYLE = {
  background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, fontSize: 12,
}

interface Props { requests: LogEntry[] }

export default function ScoreTimeline({ requests }: Props) {
  const data: Point[] = [...requests].reverse().map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    score: r.threat_score,
    level: r.threat_level,
  }))

  return (
    <div className={styles.wrap}>
      <span className={styles.title}>Score timeline</span>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f4' }} />
          <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.6}
            label={{ value: 'Redline', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            dot={(p: DotProps) => <ScoreDot key={`${p.cx}-${p.cy}`} {...p} />}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
