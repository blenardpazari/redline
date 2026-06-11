import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { IconCheck, IconCopy, IconPlus, IconServer } from '../components/ui/icons'
import Select from '../components/ui/Select'
import { api } from '../lib/api'
import { useServer } from '../context/ServerContext'
import type { Server, ServerEnv } from '../types'

const ENVS: ServerEnv[] = ['production', 'staging', 'dev']

const inputCls =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent'

const STATUS_BADGE: Record<string, string> = {
  online: 'bg-ok/10 text-ok',
  offline: 'bg-surface-2 text-dim',
  unconfigured: 'bg-sus/10 text-sus',
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

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

  const addBtn = (
    <button
      className="flex items-center gap-2 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      onClick={() => setAdding(true)}
    >
      <IconPlus size={14} /> Add Site
    </button>
  )

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sites</h1>
            <p className="text-sm text-muted">Add a server, copy the API key, run the agent — logs start appearing in real time.</p>
          </div>
          {addBtn}
        </div>

        {adding && (
          <Modal title="Add Site" onClose={() => setAdding(false)}>
            <form onSubmit={handleAdd} className="space-y-3">
              <label className="block text-sm text-muted">
                Name
                <input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. mysite.com" />
              </label>
              <label className="block text-sm text-muted">
                Environment
                <Select
                  className={`${inputCls} mt-1`}
                  value={form.env}
                  onChange={(v) => setForm(f => ({ ...f, env: v as ServerEnv }))}
                  options={ENVS.map(e => ({ value: e, label: e }))}
                />
              </label>
              {error && <p className="text-sm text-crit">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-md border border-border px-3.5 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover">Create</button>
              </div>
            </form>
          </Modal>
        )}

        {rotatedKey && (
          <Modal title="New API Key" onClose={() => setRotatedKey(null)}>
            <p className="mb-3 text-sm text-muted">Copy this now — it won't be shown again.</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs">{rotatedKey.key}</code>
              <button
                className="shrink-0 rounded border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
                onClick={() => copy(rotatedKey.key, 'key')}
              >
                {copied === 'key' ? <IconCheck size={12} /> : 'Copy'}
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover" onClick={() => setRotatedKey(null)}>Done</button>
            </div>
          </Modal>
        )}

        {servers.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface py-16">
            <IconServer size={36} className="mb-3 text-dim" />
            <p className="text-base font-medium">No sites yet</p>
            <p className="mb-5 mt-1 max-w-sm text-center text-sm text-muted">
              Add a site, run the agent on your server, and logs will appear in real time.
            </p>
            {addBtn}
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map(server => (
              <div key={server.id} className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="flex min-w-48 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-muted">
                      <IconServer size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{server.name}</div>
                      <div className="text-xs text-dim">{server.source_type} · {server.env}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[server.status] ?? STATUS_BADGE.unconfigured}`}>
                      {server.status}
                    </span>
                    <span className="font-mono text-xs text-muted">{(server.total_events ?? 0).toLocaleString()} events</span>
                    <span className="font-mono text-xs text-dim">
                      {server.last_seen ? new Date(server.last_seen).toLocaleTimeString() : 'never seen'}
                    </span>
                  </div>

                  <div className="ml-auto flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-surface-2 px-2 py-1 font-mono text-[11px] text-muted">{server.api_key.slice(0, 14)}…</code>
                      <button
                        className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:border-border-strong hover:text-fg"
                        onClick={() => copy(server.api_key, `key-${server.id}`)}
                      >
                        {copied === `key-${server.id}` ? <><IconCheck size={11} /> Copied</> : <><IconCopy size={11} /> Copy Key</>}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[12px]">
                      <button className="text-muted transition-colors hover:text-fg" onClick={() => setExpanded(expanded === server.id ? null : server.id)}>
                        {expanded === server.id ? 'Hide setup' : 'Setup guide'}
                      </button>
                      <span className="text-border-strong">·</span>
                      <button className="text-muted transition-colors hover:text-fg" onClick={() => handleRotate(server.id)}>Rotate</button>
                      <span className="text-border-strong">·</span>
                      <button className="text-crit/80 transition-colors hover:text-crit" onClick={() => handleDelete(server.id)}>Remove</button>
                    </div>
                  </div>
                </div>

                {expanded === server.id && server.setup && (
                  <div className="border-t border-border bg-surface-2/50 px-5 py-4">
                    <h3 className="mb-3 text-sm font-semibold">{server.setup.title}</h3>
                    {server.setup.steps.map((step, i) => {
                      const text = formatSetupStep(step, server.api_key)
                      return isCode(text) ? (
                        <div key={i} className="mb-2 flex items-start gap-2 rounded-md border border-border bg-bg p-3">
                          <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">{text}</code>
                          <button
                            className="shrink-0 rounded border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:border-border-strong hover:text-fg"
                            onClick={() => copy(text, `step-${i}`)}
                          >
                            {copied === `step-${i}` ? <IconCheck size={11} /> : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <p key={i} className="mb-2 text-sm text-muted">{text}</p>
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
