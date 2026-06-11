import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

interface Feature {
  name: string
  label: string
  value: number
  contribution: number
  level: 'high' | 'medium' | 'low'
  explanation: string
}

interface ExplainData {
  log_id: number
  final_score: number
  threat_level: string
  threat_type: string
  anomaly_score: number
  classifier_confidence: number
  classifier_probs: Record<string, number>
  features: Feature[]
  summary: string
}

interface Props {
  logId: number
  onClose: () => void
}

const LEVEL_COLOR = {
  high:   'bg-crit/15 text-crit border-crit/30',
  medium: 'bg-warn/15 text-warn border-warn/30',
  low:    'bg-surface-2 text-muted border-border',
}

const LEVEL_BAR = {
  high:   'bg-crit',
  medium: 'bg-warn',
  low:    'bg-ok',
}

const SCORE_COLOR = (s: number) =>
  s >= 85 ? 'text-crit' : s >= 70 ? 'text-warn' : s >= 55 ? 'text-sus' : 'text-ok'

export default function ExplainModal({ logId, onClose }: Props) {
  const [data, setData] = useState<ExplainData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<ExplainData>(`/explain/${logId}`)
      .then(setData)
      .catch(() => setError('Could not load explanation.'))
  }, [logId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Why was this flagged?</h2>
            <p className="text-[11px] text-muted">Log #{logId} · AI decision explanation</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {error && <p className="text-sm text-crit">{error}</p>}

          {!data && !error && (
            <div className="flex h-32 items-center justify-center text-sm text-dim">Loading...</div>
          )}

          {data && <>
            {/* Summary */}
            <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
              <p className="text-[13px] text-fg leading-relaxed">{data.summary}</p>
            </div>

            {/* Score strip */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
              {[
                { label: 'Final Score', value: data.final_score.toFixed(0), color: SCORE_COLOR(data.final_score) },
                { label: 'Anomaly Score', value: data.anomaly_score.toFixed(0), color: SCORE_COLOR(data.anomaly_score) },
                { label: 'Classifier Conf.', value: `${data.classifier_confidence.toFixed(0)}%`, color: SCORE_COLOR(data.classifier_confidence) },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center">
                  <div className={`font-mono text-lg font-bold ${color}`}>{value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-dim">{label}</div>
                </div>
              ))}
            </div>

            {/* Feature contributions */}
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dim">Feature Contributions</div>
              <div className="space-y-2">
                {data.features.map(f => (
                  <div key={f.name} className={`rounded-lg border px-3 py-2.5 ${LEVEL_COLOR[f.level]}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-medium">{f.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] opacity-70">
                          {f.name === 'is_known_attack_path' ? (f.value ? 'yes' : 'no') : f.value.toFixed(f.name === 'hour_of_day' ? 0 : 1)}
                        </span>
                        <span className="font-mono text-[11px] font-semibold">{f.contribution.toFixed(0)}pts</span>
                      </div>
                    </div>
                    {/* Contribution bar */}
                    <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${LEVEL_BAR[f.level]}`}
                        style={{ width: `${Math.min(100, (f.contribution / 30) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] opacity-80 leading-snug">{f.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Classifier probabilities */}
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dim">Classifier Probabilities</div>
              <div className="space-y-1.5">
                {Object.entries(data.classifier_probs)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cls, prob]) => (
                    <div key={cls} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 font-mono text-[11px] text-muted">{cls.replace('_', ' ')}</span>
                      <div className="relative flex-1 h-4 rounded bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${prob}%`,
                            background: cls === data.threat_type ? 'var(--crit)' : 'var(--border-strong, var(--border))',
                            opacity: cls === data.threat_type ? 0.7 : 0.4,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-[11px] text-muted">{prob.toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}
