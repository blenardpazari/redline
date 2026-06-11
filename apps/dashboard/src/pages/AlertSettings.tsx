import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { AlertSettings } from '../types'
import styles from './AlertSettings.module.css'

const DEFAULT: AlertSettings = {
  critical_threshold: 85, warning_threshold: 70,
  cooldown_minutes: 15, email_enabled: true, email_recipient: '',
}

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
      <div className={styles.page}>
        <h1 className={styles.title}>Alert Settings</h1>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Thresholds</h2>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Critical threshold</label>
              <span className={styles.val}>{form.critical_threshold.toFixed(0)}</span>
            </div>
            <input type="range" min={70} max={100} step={1} value={form.critical_threshold}
              onChange={(e) => set('critical_threshold', Number(e.target.value))}
              className={styles.slider} />
          </div>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Warning threshold</label>
              <span className={styles.val}>{form.warning_threshold.toFixed(0)}</span>
            </div>
            <input type="range" min={50} max={90} step={1} value={form.warning_threshold}
              onChange={(e) => set('warning_threshold', Number(e.target.value))}
              className={styles.slider} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Alert cooldown (minutes)</label>
            <input type="number" min={1} max={1440} value={form.cooldown_minutes}
              onChange={(e) => set('cooldown_minutes', Number(e.target.value))}
              className={styles.input} />
          </div>
        </div>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Email Notifications</h2>
          <div className={styles.field}>
            <label className={styles.label}>Email alerts enabled</label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={form.email_enabled}
                onChange={(e) => set('email_enabled', e.target.checked)} />
              <span className={styles.track} />
            </label>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Recipient email</label>
            <input type="email" value={form.email_recipient}
              onChange={(e) => set('email_recipient', e.target.value)}
              placeholder="alerts@example.com" className={styles.input} />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.save} onClick={handleSave}>
            {saved ? 'Saved' : 'Save Settings'}
          </button>
          <button className={styles.test} onClick={handleTestEmail}>Send Test Email</button>
          {testMsg && <span className={styles.testMsg}>{testMsg}</span>}
        </div>
      </div>
    </Layout>
  )
}
