import { useEffect, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts'
import Layout from '../components/Layout/Layout'
import { useTheme } from '../context/ThemeContext'
import { chartTheme } from '../lib/chartTheme'
import { api } from '../lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModelMetrics {
  name: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  confusion_matrix: number[][]
  classes: string[]
  per_class?: Record<string, { precision: number; recall: number; f1: number; support: number }>
  cv_f1_mean?: number
  best_params?: Record<string, unknown>
}

interface InsightsData {
  classifier: { models: ModelMetrics[]; winner: string }
  anomaly: { models: ModelMetrics[]; winner: string }
  score_distribution: { buckets: string[]; distribution: Record<string, number[]> }
  dataset: { total: number; class_counts: Record<string, number>; test_size: number }
  trained_at: string
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricBadge({ value, label }: { value: number; label: string }) {
  const pct = `${(value * 100).toFixed(1)}%`
  const color = value >= 0.95 ? 'text-ok' : value >= 0.85 ? 'text-warn' : 'text-crit'
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-surface-2 px-4 py-3">
      <span className={`font-mono text-xl font-bold ${color}`}>{pct}</span>
      <span className="mt-0.5 text-[11px] uppercase tracking-wide text-dim">{label}</span>
    </div>
  )
}

function ConfusionMatrix({ matrix, classes }: { matrix: number[][]; classes: string[] }) {
  const max = Math.max(...matrix.flat())
  const short = classes.map(c => c.replace('_', '\n').slice(0, 6))
  return (
    <div className="overflow-x-auto p-3">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `28px repeat(${classes.length}, 1fr)` }}>
        <div />
        {short.map((l, i) => (
          <div key={i} className="flex items-center justify-center px-1 py-0.5 font-mono text-[9px] font-semibold uppercase text-dim">{l}</div>
        ))}
        {matrix.map((row, i) => ([
          <div key={`l${i}`} className="flex items-center justify-end pr-1.5 font-mono text-[9px] font-semibold uppercase text-dim">{short[i]}</div>,
          ...row.map((val, j) => (
            <div
              key={`${i}${j}`}
              title={`${classes[i]} → ${classes[j]}: ${val}`}
              className="flex h-9 w-10 items-center justify-center rounded font-mono text-[11px] font-medium"
              style={{
                background: i === j
                  ? `rgba(74,222,128,${0.1 + (val / max) * 0.75})`
                  : val > 0
                    ? `rgba(248,113,113,${0.08 + (val / max) * 0.6})`
                    : 'transparent',
                color: i === j ? 'var(--ok)' : val > 0 ? 'var(--crit)' : 'var(--dim)',
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

function ModelComparisonBar({ models, metric }: { models: ModelMetrics[]; metric: keyof ModelMetrics }) {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')
  const data = models.map(m => ({
    name: m.name,
    value: Math.round((m[metric] as number) * 1000) / 10,
  }))
  const COLORS = [t.blue, t.ok, t.warn]
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="name" tick={t.tick} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={t.tick} axisLine={false} tickLine={false} width={32} unit="%" />
        <Tooltip
          contentStyle={t.tooltip}
          labelStyle={t.tooltipLabel}
          formatter={(v: number) => [`${v}%`, metric.toString().toUpperCase()]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function PerClassRadar({ perClass }: { perClass: Record<string, { precision: number; recall: number; f1: number }> }) {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')
  const data = Object.entries(perClass).map(([cls, v]) => ({
    class: cls.replace('_', ' '),
    Precision: Math.round(v.precision * 100),
    Recall: Math.round(v.recall * 100),
    F1: Math.round(v.f1 * 100),
  }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data}>
        <PolarGrid stroke={t.grid} />
        <PolarAngleAxis dataKey="class" tick={t.tick} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Precision" dataKey="Precision" stroke={t.blue} fill={t.blue} fillOpacity={0.15} />
        <Radar name="Recall" dataKey="Recall" stroke={t.ok} fill={t.ok} fillOpacity={0.15} />
        <Radar name="F1" dataKey="F1" stroke={t.warn} fill={t.warn} fillOpacity={0.15} />
        <Legend wrapperStyle={{ fontSize: 11, color: t.tick.fill }} />
        <Tooltip contentStyle={t.tooltip} formatter={(v: number) => `${v}%`} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function DatasetBar({ classCounts }: { classCounts: Record<string, number> }) {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')
  const data = Object.entries(classCounts).map(([k, v]) => ({ name: k.replace('_', ' '), count: v }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ ...t.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={t.tick} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={t.tooltip} labelStyle={t.tooltipLabel} />
        <Bar dataKey="count" fill={t.blue} radius={[3, 3, 0, 0]} name="Samples" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function WinnerBadge() {
  return (
    <span className="ml-2 rounded-full bg-ok/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-ok">
      ✓ BEST
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'classifier' | 'anomaly'>('classifier')

  useEffect(() => {
    api.get<InsightsData>('/insights')
      .then(setData)
      .catch(() => setError('evaluation.json not found — run train.py first'))
  }, [])

  if (error) return (
    <Layout>
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-crit">{error}</p>
          <code className="mt-2 block rounded bg-surface-2 px-3 py-2 font-mono text-xs text-muted">
            cd apps/ml && python train.py
          </code>
        </div>
      </div>
    </Layout>
  )

  if (!data) return (
    <Layout>
      <div className="flex h-64 items-center justify-center text-sm text-dim">Loading...</div>
    </Layout>
  )

  const activeModels = tab === 'classifier' ? data.classifier.models : data.anomaly.models
  const winner = tab === 'classifier' ? data.classifier.winner : data.anomaly.winner
  const bestModel = activeModels.find(m => m.name === winner) ?? activeModels[0]

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">ML Insights</h1>
            <p className="text-sm text-muted">
              Live evaluation metrics · Trained on {data.dataset.total.toLocaleString()} samples ·{' '}
              <span className="font-mono text-xs text-dim">{new Date(data.trained_at).toLocaleString()}</span>
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-surface-2 p-0.5">
            {(['classifier', 'anomaly'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
                }`}
              >
                {t === 'classifier' ? 'Threat Classifier' : 'Anomaly Detector'}
              </button>
            ))}
          </div>
        </div>

        {/* Best model summary metrics */}
        <div className="flex gap-3">
          {(['accuracy', 'precision', 'recall', 'f1'] as const).map(metric => (
            <MetricBadge key={metric} value={bestModel[metric] as number} label={metric} />
          ))}
          {bestModel.cv_f1_mean != null && (
            <MetricBadge value={bestModel.cv_f1_mean} label="CV F1" />
          )}
          <div className="flex flex-1 flex-col items-end justify-center gap-1 text-right">
            <span className="text-xs text-muted">Best model</span>
            <span className="text-sm font-semibold text-fg">{winner}</span>
            {bestModel.best_params && (
              <span className="font-mono text-[10px] text-dim">
                {Object.entries(bestModel.best_params).map(([k, v]) => `${k}=${v}`).join(' · ')}
              </span>
            )}
          </div>
        </div>

        {/* Model comparison + confusion matrix */}
        <div className="grid grid-cols-2 gap-4">
          <Card title="Model Comparison — F1 Score">
            <ModelComparisonBar models={activeModels} metric="f1" />
            <div className="mt-3 space-y-1">
              {activeModels.map(m => (
                <div key={m.name} className="flex items-center justify-between rounded-md px-3 py-1.5 text-xs hover:bg-surface-2">
                  <span className="font-medium text-fg">
                    {m.name}
                    {m.name === winner && <WinnerBadge />}
                  </span>
                  <span className="font-mono text-muted">
                    A={pct(m.accuracy)} P={pct(m.precision)} R={pct(m.recall)} F1={pct(m.f1)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title={`Confusion Matrix — ${bestModel.name}`}>
            <ConfusionMatrix matrix={bestModel.confusion_matrix} classes={bestModel.classes} />
          </Card>
        </div>

        {/* Per-class radar + dataset distribution */}
        <div className="grid grid-cols-2 gap-4">
          {bestModel.per_class && (
            <Card title="Per-Class Precision / Recall / F1">
              <PerClassRadar perClass={bestModel.per_class} />
              <div className="mt-2 grid grid-cols-3 gap-1">
                {Object.entries(bestModel.per_class).map(([cls, v]) => (
                  <div key={cls} className="rounded-md bg-surface-2 px-2 py-1.5 text-center">
                    <div className="font-mono text-[10px] font-semibold text-muted">{cls.replace('_', ' ')}</div>
                    <div className="font-mono text-[11px] text-fg">F1 {pct(v.f1)}</div>
                    <div className="font-mono text-[9px] text-dim">{v.support} samples</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Training Dataset Distribution">
            <DatasetBar classCounts={data.dataset.class_counts} />
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(data.dataset.class_counts).map(([cls, n]) => (
                <span key={cls} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted">
                  {cls}: {n}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}
