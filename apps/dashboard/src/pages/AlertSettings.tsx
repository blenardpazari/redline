import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { AlertSettings } from '../types'

const DEFAULT: AlertSettings = {
  critical_threshold: 85, warning_threshold: 70,
  cooldown_minutes: 15, email_enabled: true, email_recipient: '',
}

const inputCls =
  'w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent'

export default function AlertSettingsPage() {
  const [form, setForm] = useState<AlertSettings>(DEFAULT)
  const [saved, setSaved] = useState(false)
  const [testMsg, setTestMsg] = useState<string | null>(null)

  useEffect(() => {
    api.get<AlertSettings>('/settings').then(setForm).catch(() => undefined)
  }, [])

  function set<K extends keyof AlertSettings>(k: K, v: AlertSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }

  async function handleSave() {
    await api.post<AlertSettings>('/settings', form)
    setSaved(true)
  }

  async function handleTestEmail() {
    setTestMsg(null)
    try {
      await api.post('/settings/test-email', {})
      setTestMsg('Test email sent.')
    } catch {
      setTestMsg('Failed — check SMTP config.')
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Alert Settings</h1>
          <p className="text-sm text-muted">Thresholds, cooldowns, and notifications</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Thresholds</h2>

          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-muted">Critical threshold</label>
              <span className="font-mono text-sm font-semibold text-crit">{form.critical_threshold.toFixed(0)}</span>
            </div>
            <input
              type="range" min={70} max={100} step={1} value={form.critical_threshold}
              onChange={(e) => set('critical_threshold', Number(e.target.value))}
              className="w-full accent-(--accent)"
            />
          </div>

          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-muted">Warning threshold</label>
              <span className="font-mono text-sm font-semibold text-warn">{form.warning_threshold.toFixed(0)}</span>
            </div>
            <input
              type="range" min={50} max={90} step={1} value={form.warning_threshold}
              onChange={(e) => set('warning_threshold', Number(e.target.value))}
              className="w-full accent-(--accent)"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Alert cooldown (minutes)</label>
            <input
              type="number" min={1} max={1440} value={form.cooldown_minutes}
              onChange={(e) => set('cooldown_minutes', Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Email Notifications</h2>

          <div className="mb-5 flex items-center justify-between">
            <label className="text-sm text-muted">Email alerts enabled</label>
            <button
              role="switch"
              aria-checked={form.email_enabled}
              onClick={() => set('email_enabled', !form.email_enabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.email_enabled ? 'bg-accent' : 'bg-border-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  form.email_enabled ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Recipient email</label>
            <input
              type="email" value={form.email_recipient}
              onChange={(e) => set('email_recipient', e.target.value)}
              placeholder="alerts@example.com" className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            onClick={handleSave}
          >
            {saved ? 'Saved ✓' : 'Save Settings'}
          </button>
          <button
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg"
            onClick={handleTestEmail}
          >
            Send Test Email
          </button>
          {testMsg && <span className="text-sm text-muted">{testMsg}</span>}
        </div>
      </div>
    </Layout>
  )
}
