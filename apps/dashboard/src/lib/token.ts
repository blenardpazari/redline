const TOKEN_KEY = 'redline_token'

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp: number }
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export function isAuthenticated(): boolean {
  const token = getToken()
  return token !== null && !isExpired(token)
}
