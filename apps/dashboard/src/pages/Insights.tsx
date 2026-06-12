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
  feature_importances?: number[]
}

interface InsightsData {
  classifier: { models: ModelMetrics[]; winner: string }
  anomaly: { models: ModelMetrics[]; winner: string }
  score_distribution: { buckets: string[]; distribution: Record<string, number[]> }
  dataset: { total: number; class_counts: Record<string, number>; test_size: number }
  trained_at: string
}

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

const RF_FEATURE_NAMES = ['Hour of Day', 'Path Length', 'Status Code', 'Response Time', 'Attack Path']

function FeatureImportanceChart({ importances }: { importances: number[] }) {
  const { theme } = useTheme()
  const t = chartTheme(theme === 'dark')
  const data = importances
    .map((v, i) => ({ name: RF_FEATURE_NAMES[i] ?? `f${i}`, value: Math.round(v * 1000) / 10 }))
    .sort((a, b) => b.value - a.value)
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 80 }}>
        <CartesianGrid stroke={t.grid} horizontal={false} />
        <XAxis type="number" tick={t.tick} axisLine={false} tickLine={false} unit="%" domain={[0, 'dataMax']} />
        <YAxis type="category" dataKey="name" tick={{ ...t.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={76} />
        <Tooltip contentStyle={t.tooltip} formatter={(v: number) => [`${v}%`, 'Importance']} />
        <Bar dataKey="value" fill={t.warn} radius={[0, 4, 4, 0]} maxBarSize={18} />
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

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'classifier' | 'anomaly'>('classifier')
  const [retraining, setRetraining] = useState(false)
  const [retrainMsg, setRetrainMsg] = useState('')

  const loadData = () => {
    api.get<InsightsData>('/insights')
      .then(d => { setData(d); setError('') })
      .catch(() => setError('evaluation.json not found — run train.py first'))
  }

  useEffect(() => { loadData() }, [])

  async function handleRetrain() {
    setRetraining(true)
    setRetrainMsg('Training started...')
    try {
      await api.post('/insights/retrain', {})
      const poll = setInterval(async () => {
        try {
          const s = await api.get<{ running: boolean; last_exit: number | null }>('/insights/retrain/status')
          if (!s.running) {
            clearInterval(poll)
            setRetraining(false)
            if (s.last_exit === 0) {
              setRetrainMsg('Retrain complete ✓')
              loadData()
            } else {
              setRetrainMsg(`Retrain failed (exit ${s.last_exit})`)
            }
          }
        } catch { clearInterval(poll); setRetraining(false) }
      }, 2000)
    } catch {
      setRetraining(false)
      setRetrainMsg('Failed to start retrain')
    }
  }

  if (error) return (
    <Layout>
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-crit">{error}</p>
          <p className="mt-1 text-xs text-muted">Train the model using your production logs:</p>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="mt-4 flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-surface hover:text-fg disabled:opacity-50 mx-auto"
          >
            {retraining ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {retraining ? 'Training...' : 'Train Model Now'}
          </button>
          {retrainMsg && (
            <p className={`mt-3 text-xs ${retrainMsg.includes('✓') ? 'text-ok' : retrainMsg.includes('fail') || retrainMsg.includes('Failed') ? 'text-crit' : 'text-muted'}`}>
              {retrainMsg}
            </p>
          )}
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
  const rfModel = data.classifier.models.find(m => m.feature_importances)

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">ML Insights</h1>
            <p className="text-sm text-muted">
              Live evaluation metrics · Trained on {data.dataset.total.toLocaleString()} samples ·{' '}
              <span className="font-mono text-xs text-dim">{new Date(data.trained_at).toLocaleString()}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {retrainMsg && (
                <span className={`text-xs ${retrainMsg.includes('✓') ? 'text-ok' : retrainMsg.includes('fail') || retrainMsg.includes('Failed') ? 'text-crit' : 'text-muted'}`}>
                  {retrainMsg}
                </span>
              )}
              <button
                onClick={handleRetrain}
                disabled={retraining}
                className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface hover:text-fg disabled:opacity-50"
              >
                {retraining ? (
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {retraining ? 'Training...' : 'Retrain Model'}
              </button>
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
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        {rfModel?.feature_importances && (
          <Card title="Feature Importance — Random Forest">
            <FeatureImportanceChart importances={rfModel.feature_importances} />
            <p className="mt-2 text-[11px] text-dim">
              Which input features the Random Forest relies on most when classifying a request as a threat.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  )
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}
