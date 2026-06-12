import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import { IconPlus, IconTrash } from '../components/ui/icons'

type ConnectorType = 'slack' | 'telegram' | 'discord' | 'webhook' | 'email'

interface Connector {
  id: number
  name: string
  type: ConnectorType
  config: Record<string, string>
  enabled: boolean
  created_at: string
}

const TYPE_LABELS: Record<ConnectorType, string> = {
  slack:    'Slack',
  telegram: 'Telegram',
  discord:  'Discord',
  webhook:  'Webhook',
  email:    'Email',
}

const TYPE_FIELDS: Record<ConnectorType, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  slack: [
    { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
  ],
  telegram: [
    { key: 'bot_token', label: 'Bot Token', placeholder: '123456:ABC-DEF...', secret: true },
    { key: 'chat_id', label: 'Chat ID', placeholder: '-1001234567890' },
  ],
  discord: [
    { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' },
  ],
  webhook: [
    { key: 'url', label: 'URL', placeholder: 'https://your-server.com/webhook' },
    { key: 'secret', label: 'Secret (optional)', placeholder: 'shared secret', secret: true },
  ],
  email: [
    { key: 'smtp_host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
    { key: 'smtp_port', label: 'SMTP Port', placeholder: '587' },
    { key: 'smtp_user', label: 'SMTP Username', placeholder: 'you@gmail.com' },
    { key: 'smtp_password', label: 'SMTP Password / App password', placeholder: '••••••••', secret: true },
    { key: 'recipient', label: 'Recipient address', placeholder: 'alerts@example.com' },
  ],
}

const EMPTY_CONFIG: Record<ConnectorType, Record<string, string>> = {
  slack:    { webhook_url: '' },
  telegram: { bot_token: '', chat_id: '' },
  discord:  { webhook_url: '' },
  webhook:  { url: '', secret: '' },
  email:    { smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '', recipient: '' },
}

const inputCls = 'w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent'

function ConnectorTypeIcon({ type }: { type: ConnectorType }) {
  const icons: Record<ConnectorType, string> = {
    slack: 'S',
    telegram: 'TG',
    discord: 'D',
    webhook: '⚡',
    email: '@',
  }
  const colors: Record<ConnectorType, string> = {
    slack: 'bg-[#4A154B] text-white',
    telegram: 'bg-[#0088CC] text-white',
    discord: 'bg-[#5865F2] text-white',
    webhook: 'bg-surface-2 text-fg',
    email:   'bg-surface-2 text-fg',
  }
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${colors[type]}`}>
      {icons[type]}
    </span>
  )
}

interface FormState {
  name: string
  type: ConnectorType
  config: Record<string, string>
  enabled: boolean
}

const BLANK: FormState = {
  name: '',
  type: 'slack',
  config: EMPTY_CONFIG.slack,
  enabled: true,
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(BLANK)
  const [testMsg, setTestMsg] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    api.get<Connector[]>('/connectors').then(setConnectors).catch(() => undefined)
  }, [])

  function setType(type: ConnectorType) {
    setForm(f => ({ ...f, type, config: { ...EMPTY_CONFIG[type] } }))
  }

  function setConfig(key: string, value: string) {
    setForm(f => ({ ...f, config: { ...f.config, [key]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const created = await api.post<Connector>('/connectors', form)
      setConnectors(c => [...c, created])
      setShowForm(false)
      setForm(BLANK)
    } catch {
      // keep form open
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(c: Connector) {
    const updated = await api.put<Connector>(`/connectors/${c.id}`, {
      ...c, enabled: !c.enabled,
    }).catch(() => null)
    if (updated) setConnectors(cs => cs.map(x => x.id === c.id ? updated : x))
  }

  async function handleDelete(id: number) {
    await api.delete(`/connectors/${id}`).catch(() => null)
    setConnectors(cs => cs.filter(c => c.id !== id))
  }

  async function handleTest(type: ConnectorType, config: Record<string, string>, key: string) {
    setTesting(key)
    setTestMsg(null)
    try {
      await api.post('/connectors/test', { type, config })
      setTestMsg({ id: key, ok: true, msg: 'Test sent successfully.' })
    } catch (e: any) {
      setTestMsg({ id: key, ok: false, msg: e?.detail ?? 'Test failed.' })
    } finally {
      setTesting(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted">Send alerts to Slack, Telegram, Discord, email, or custom webhooks</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <IconPlus size={14} />
              Add integration
            </button>
          )}
        </div>

        {showForm && (
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold">New integration</h2>

            <div>
              <label className="mb-1.5 block text-xs text-muted">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Slack alerts"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted">Type</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(TYPE_LABELS) as ConnectorType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      form.type === t
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg'
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {TYPE_FIELDS[form.type].map(f => (
              <div key={f.key}>
                <label className="mb-1.5 block text-xs text-muted">{f.label}</label>
                <input
                  type={f.secret ? 'password' : 'text'}
                  value={form.config[f.key] ?? ''}
                  onChange={e => setConfig(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className={inputCls}
                />
              </div>
            ))}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { handleTest(form.type, form.config, 'new') }}
                disabled={testing === 'new'}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50"
              >
                {testing === 'new' ? 'Sending…' : 'Test'}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(BLANK) }}
                className="text-sm text-dim hover:text-muted transition-colors"
              >
                Cancel
              </button>
              {testMsg?.id === 'new' && (
                <span className={`text-sm ${testMsg.ok ? 'text-ok' : 'text-crit'}`}>{testMsg.msg}</span>
              )}
            </div>
          </div>
        )}

        {connectors.length === 0 && !showForm ? (
          <div className="rounded-lg border border-border bg-surface p-10 text-center">
            <p className="text-sm text-dim">No integrations configured yet.</p>
            <p className="mt-1 text-xs text-dim">Add one to receive alerts in Slack, Telegram, Discord, email, or a custom webhook.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {connectors.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
                <ConnectorTypeIcon type={c.type} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted">{TYPE_LABELS[c.type]}</div>
                </div>

                <div className="flex items-center gap-2">
                  {testMsg?.id === String(c.id) && (
                    <span className={`text-xs ${testMsg.ok ? 'text-ok' : 'text-crit'}`}>{testMsg.msg}</span>
                  )}
                  <button
                    onClick={() => handleTest(c.type, c.config, String(c.id))}
                    disabled={testing === String(c.id)}
                    className="rounded px-2 py-1 text-xs text-muted border border-border hover:border-border-strong hover:text-fg transition-colors disabled:opacity-50"
                  >
                    {testing === String(c.id) ? '…' : 'Test'}
                  </button>

                  <button
                    role="switch"
                    aria-checked={c.enabled}
                    onClick={() => handleToggle(c)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${c.enabled ? 'bg-accent' : 'bg-border-strong'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${c.enabled ? 'left-4.5' : 'left-0.5'}`} />
                  </button>

                  <button
                    onClick={() => handleDelete(c.id)}
                    className="flex h-7 w-7 items-center justify-center rounded text-dim hover:bg-surface-2 hover:text-crit transition-colors"
                    title="Delete"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
