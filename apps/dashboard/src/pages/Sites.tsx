import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import { useServer } from '../context/ServerContext'
import type { Server, ServerEnv, ServerSourceType } from '../types'
import styles from './Sites.module.css'

const SOURCE_TYPES: { value: ServerSourceType | 'cloudpanel'; label: string; icon: string }[] = [
  { value: 'cloudpanel', label: 'CloudPanel', icon: '☁️' },
  { value: 'nginx', label: 'nginx', icon: '🟢' },
  { value: 'apache', label: 'Apache', icon: '🟠' },
  { value: 'caddy', label: 'Caddy', icon: '🔵' },
  { value: 'hetzner', label: 'Hetzner VPS', icon: '🔴' },
  { value: 'gcp', label: 'GCP Logging', icon: '☁️' },
  { value: 'syslog', label: 'Syslog', icon: '📋' },
  { value: 'http', label: 'HTTP / Webhook', icon: '🔗' },
]

const ENVS: ServerEnv[] = ['production', 'staging', 'dev']

export default function Sites() {
  const { reload } = useServer()
  const [servers, setServers] = useState<Server[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', env: 'production' as ServerEnv, source_type: 'cloudpanel' })
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [rotatedKey, setRotatedKey] = useState<{ id: number; key: string } | null>(null)

  async function load() {
    try {
      const data = await api.get<Server[]>('/servers')
      setServers(data)
    } catch { /* ignore */ }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/servers', form)
      setForm({ name: '', env: 'production', source_type: 'cloudpanel' })
      setAdding(false)
      load()
      reload()
    } catch {
      setError('Failed to create server.')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this server? Existing log entries are kept.')) return
    await api.delete(`/servers/${id}`)
    load()
    reload()
    if (expanded === id) setExpanded(null)
  }

  async function handleRotate(id: number) {
    const res = await api.post<{ api_key: string }>(`/servers/${id}/rotate-key`)
    setRotatedKey({ id, key: res.api_key })
    load()
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  function statusBadge(s: Server) {
    const cfg: Record<string, { cls: string; dot: string }> = {
      online: { cls: styles.badgeOnline, dot: '●' },
      offline: { cls: styles.badgeOffline, dot: '○' },
      unconfigured: { cls: styles.badgeNew, dot: '◌' },
    }
    const { cls, dot } = cfg[s.status] ?? cfg.unconfigured
    return <span className={`${styles.badge} ${cls}`}>{dot} {s.status}</span>
  }

  function sourceIcon(type: string) {
    return SOURCE_TYPES.find(t => t.value === type)?.icon ?? '🖥️'
  }

  function formatSetupStep(step: string, apiKey: string) {
    return step.replace(/\{api_key\}/g, apiKey)
  }

  const isCode = (step: string) =>
    step.startsWith('curl') ||
    step.startsWith('nohup') ||
    step.startsWith('REDLINE') ||
    step.startsWith('ls ') ||
    step.startsWith('*.') ||
    step.startsWith('log {') ||
    step.includes('=https://')

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Sites</h1>
            <p className={styles.subtitle}>Add a server, copy the API key, run the agent — logs start appearing in real time.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setAdding(true)}>+ Add Site</button>
        </div>

        {/* Add modal */}
        {adding && (
          <div className={styles.overlay} onClick={() => setAdding(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Add Site</h2>
              <form onSubmit={handleAdd} className={styles.form}>
                <label className={styles.label}>
                  Name
                  <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. mysite.com" />
                </label>
                <label className={styles.label}>
                  Server type
                  <select className={styles.input} value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}>
                    {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </label>
                <label className={styles.label}>
                  Environment
                  <select className={styles.input} value={form.env} onChange={e => setForm(f => ({ ...f, env: e.target.value as ServerEnv }))}>
                    {ENVS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </label>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setAdding(false)}>Cancel</button>
                  <button type="submit" className={styles.submitBtn}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rotated key modal */}
        {rotatedKey && (
          <div className={styles.overlay} onClick={() => setRotatedKey(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>New API Key</h2>
              <p className={styles.modalHint}>Copy this now — it won't be shown again.</p>
              <div className={styles.keyBox}>
                <code className={styles.keyCode}>{rotatedKey.key}</code>
                <button className={styles.copyInline} onClick={() => copy(rotatedKey.key, 'key')}>
                  {copied === 'key' ? '✓' : 'Copy'}
                </button>
              </div>
              <div className={styles.formActions}>
                <button className={styles.submitBtn} onClick={() => setRotatedKey(null)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {servers.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🖥️</div>
            <p className={styles.emptyTitle}>No sites yet</p>
            <p className={styles.emptyText}>Add a site, run the agent on your server, and logs will appear in real time.</p>
            <button className={styles.addBtn} onClick={() => setAdding(true)}>+ Add Site</button>
          </div>
        ) : (
          <div className={styles.list}>
            {servers.map(server => (
              <div key={server.id} className={styles.card}>
                <div className={styles.cardMain}>
                  <div className={styles.cardLeft}>
                    <span className={styles.icon}>{sourceIcon(server.source_type)}</span>
                    <div>
                      <div className={styles.serverName}>{server.name}</div>
                      <div className={styles.serverMeta}>{server.source_type} · {server.env}</div>
                    </div>
                  </div>
                  <div className={styles.cardCenter}>
                    {statusBadge(server)}
                    <span className={styles.metaStat}>{(server.total_events ?? 0).toLocaleString()} events</span>
                    <span className={styles.metaStat}>
                      {server.last_seen ? new Date(server.last_seen).toLocaleTimeString() : 'never seen'}
                    </span>
                  </div>
                  <div className={styles.cardRight}>
                    <div className={styles.keyRow}>
                      <code className={styles.keyPreview}>{server.api_key.slice(0, 14)}…</code>
                      <button className={styles.copyBtn} onClick={() => copy(server.api_key, `key-${server.id}`)}>
                        {copied === `key-${server.id}` ? '✓ Copied' : 'Copy Key'}
                      </button>
                    </div>
                    <div className={styles.actions}>
                      <button className={styles.setupToggle} onClick={() => setExpanded(expanded === server.id ? null : server.id)}>
                        {expanded === server.id ? 'Hide setup' : 'Setup guide'}
                      </button>
                      <button className={styles.rotateBtn} onClick={() => handleRotate(server.id)}>Rotate</button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(server.id)}>Remove</button>
                    </div>
                  </div>
                </div>

                {expanded === server.id && server.setup && (
                  <div className={styles.setup}>
                    <h3 className={styles.setupTitle}>{server.setup.title}</h3>
                    {server.setup.steps.map((step, i) => {
                      const text = formatSetupStep(step, server.api_key)
                      return isCode(text) ? (
                        <div key={i} className={styles.codeBlock}>
                          <code>{text}</code>
                          <button className={styles.copyInline} onClick={() => copy(text, `step-${i}`)}>
                            {copied === `step-${i}` ? '✓' : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <p key={i} className={styles.setupStep}>{text}</p>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
