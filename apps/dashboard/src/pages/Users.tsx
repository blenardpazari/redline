import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { IconPlus } from '../components/ui/icons'
import { api } from '../lib/api'
import type { User } from '../types'

const inputCls =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent'

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' as 'admin' | 'viewer' })
  const [error, setError] = useState('')

  function load() {
    api.get<User[]>('/users').then(setUsers).catch(() => {})
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/users', form)
      load()
      setCreating(false)
      setForm({ username: '', password: '', role: 'viewer' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  async function handleDelete(id: number, username: string) {
    if (!confirm(`Delete user "${username}"?`)) return
    await api.delete(`/users/${id}`)
    load()
  }

  async function handleRoleToggle(user: User) {
    const newRole = user.role === 'admin' ? 'viewer' : 'admin'
    await api.patch(`/users/${user.id}`, { role: newRole })
    load()
  }

  const thCls = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-dim'

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Users</h1>
            <p className="text-sm text-muted">Manage admin accounts and access roles</p>
          </div>
          <button
            className="flex items-center gap-2 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            onClick={() => setCreating(true)}
          >
            <IconPlus size={14} /> Add User
          </button>
        </div>

        {creating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setCreating(false)}>
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="mb-4 text-base font-semibold">Add User</h2>
              <form onSubmit={handleCreate} className="space-y-3">
                <label className="block text-sm text-muted">Username
                  <input className={`${inputCls} mt-1`} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                </label>
                <label className="block text-sm text-muted">Password (min 8 chars)
                  <input className={`${inputCls} mt-1`} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
                </label>
                <label className="block text-sm text-muted">Role
                  <select className={`${inputCls} mt-1`} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'viewer' }))}>
                    <option value="viewer">Viewer — read-only</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </label>
                {error && <p className="text-sm text-crit">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="rounded-md border border-border px-3.5 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg" onClick={() => setCreating(false)}>Cancel</button>
                  <button type="submit" className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className={thCls}>Username</th><th className={thCls}>Role</th>
                <th className={thCls}>Created</th><th className={thCls}>Last Login</th><th className={thCls}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="px-4 py-2.5 text-sm font-medium">{u.username}</td>
                  <td className="px-4 py-2.5">
                    <button
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80 ${
                        u.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-muted'
                      }`}
                      onClick={() => handleRoleToggle(u)}
                      title="Click to toggle role"
                    >
                      {u.role}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="rounded border border-border px-2 py-1 text-[11px] text-crit/80 transition-colors hover:border-crit/40 hover:text-crit"
                      onClick={() => handleDelete(u.id, u.username)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-dim">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
