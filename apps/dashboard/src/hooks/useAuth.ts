import { useCallback, useState } from 'react'
import { api } from '../lib/api'
import { getToken, isAuthenticated, removeToken, saveToken } from '../lib/token'

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated)

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const { token } = await api.post<{ token: string }>('/auth/login', { username, password })
    saveToken(token)
    setAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setAuthenticated(false)
  }, [])

  return { authenticated, login, logout, token: getToken() }
}
