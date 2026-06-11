import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    setLoading(true)
    setError(null)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-dim hover:border-border-strong focus:border-accent'

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-lg font-bold text-white shadow-md">
          RL
        </div>
        <h1 className="text-center text-xl font-semibold tracking-tight">Redline</h1>
        <p className="mb-6 mt-1 text-center text-sm text-muted">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="username"
            type="text"
            placeholder="Username"
            className={inputCls}
            autoComplete="username"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className={inputCls}
            autoComplete="current-password"
            required
          />
          {error !== null && <p className="text-sm text-crit">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Authenticating…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
