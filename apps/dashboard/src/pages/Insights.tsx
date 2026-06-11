import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Layout from '../components/Layout/Layout'
import { useTheme } from '../context/ThemeContext'
import { chartTheme } from '../lib/chartTheme'

const MODEL_COMPARISON = [
  { name: 'Isolation Forest', accuracy: 94.2 },
  { name: 'LOF', accuracy: 91.5 },
  { name: 'One-Class SVM', accuracy: 88.3 },
]

const CM_LABELS = ['NORM', 'BRUT', 'SQL', 'SCAN', 'PATH', 'BOT']
const CM_DATA = [
  [580,   0,  0,  0,  0,  3],
  [  0,  98,  0,  1,  0,  0],
  [  0,   0, 79,  0,  0,  0],
  [  0,   1,  0, 97,  0,  2],
  [  0,   0,  2,  0, 67,  0],
  [  4,   0,  0,  2,  0, 43],
]

const CM_MAX = Math.max(...CM_DATA.flat())

function ConfusionMatrix() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="grid grid-cols-7 gap-1">
        <div />
        {CM_LABELS.map((l) => (
          <div key={l} className="flex items-center justify-center p-1 font-mono text-[10px] text-dim">{l}</div>
        ))}
        {CM_DATA.map((row, i) => ([
          <div key={`l${i}`} className="flex items-center justify-center p-1 font-mono text-[10px] text-dim">{CM_LABELS[i]}</div>,
          ...row.map((val, j) => (
            <div
              key={`${i}${j}`}
              className="flex h-10 w-12 items-center justify-center rounded font-mono text-xs"
              style={{
                background: i === j
                  ? `rgba(34,197,94,${val / CM_MAX})`
                  : `rgba(239,68,68,${(val / CM_MAX) * 3})`,
              }}
            >
              {val}
            </div>
          )),
        ]))}
      </div>
    </div>
  )
}

function StatCard({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="font-mono text-2xl font-semibold text-ok">{value}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
      <div className="text-xs text-dim">{sub}</div>
    </div>
  )
}

export default function Insights() {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">ML Insights</h1>
          <p className="text-sm text-muted">Model performance and evaluation metrics</p>
        </div>

        <div className="flex gap-4">
          <StatCard value="94.2%" label="Anomaly Detector" sub="Isolation Forest · 5-fold CV" />
          <StatCard value="97.1%" label="Threat Classifier" sub="TF-IDF + LogReg · 5-fold CV" />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col rounded-lg border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">Anomaly Model Comparison</div>
            <div className="h-72 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MODEL_COMPARISON} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis dataKey="name" tick={t.tick} axisLine={false} tickLine={false} />
                  <YAxis domain={[80, 100]} tick={t.tick} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={t.tooltip} labelStyle={t.tooltipLabel} cursor={{ fill: t.grid }} />
                  <Bar dataKey="accuracy" fill={t.ok} radius={[3, 3, 0, 0]} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex flex-1 flex-col rounded-lg border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3 text-sm font-medium">Classifier Confusion Matrix</div>
            <ConfusionMatrix />
          </div>
        </div>
      </div>
    </Layout>
  )
}
