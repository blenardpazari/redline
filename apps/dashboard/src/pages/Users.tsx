import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { User } from '../types'
import styles from './Users.module.css'

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

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Users</h1>
            <p className={styles.subtitle}>Manage admin accounts and access roles</p>
          </div>
          <button className={styles.addBtn} onClick={() => setCreating(true)}>+ Add User</button>
        </div>

        {creating && (
          <div className={styles.modal}>
            <div className={styles.modalBox}>
              <h2 className={styles.modalTitle}>Add User</h2>
              <form onSubmit={handleCreate} className={styles.form}>
                <label className={styles.label}>Username
                  <input className={styles.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                </label>
                <label className={styles.label}>Password (min 8 chars)
                  <input className={styles.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
                </label>
                <label className={styles.label}>Role
                  <select className={styles.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'viewer' }))}>
                    <option value="viewer">Viewer — read-only</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </label>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
                  <button type="submit" className={styles.submitBtn}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Username</th><th>Role</th><th>Created</th><th>Last Login</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className={styles.username}>{u.username}</td>
                  <td>
                    <button
                      className={u.role === 'admin' ? styles.roleAdmin : styles.roleViewer}
                      onClick={() => handleRoleToggle(u)}
                      title="Click to toggle role"
                    >
                      {u.role}
                    </button>
                  </td>
                  <td className={styles.mono}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className={styles.mono}>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(u.id, u.username)}>Delete</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
