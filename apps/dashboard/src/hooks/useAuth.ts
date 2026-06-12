import { useCallback, useState } from 'react'
import { api } from '../lib/api'
import { getToken, isAuthenticated, removeToken, saveToken } from '../lib/token'

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated)

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    let client_ip: string | undefined
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      client_ip = data.ip
    } catch {}
    const { token } = await api.post<{ token: string }>('/auth/login', { username, password, client_ip })
    saveToken(token)
    setAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setAuthenticated(false)
  }, [])

  return { authenticated, login, logout, token: getToken() }
}
