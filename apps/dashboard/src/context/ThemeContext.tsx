import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolved: 'dark' | 'light'
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolved: 'dark',
  setTheme: () => undefined,
  toggle: () => undefined,
})

const STORAGE_KEY = 'redline-theme'
const CYCLE: Theme[] = ['system', 'light', 'dark']

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? (stored as Theme) : 'system'
  })

  const resolved = resolve(theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, resolved])

  // Keep in sync when OS preference changes while on 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => document.documentElement.classList.toggle('dark', mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
  }

  function toggle() {
    setThemeState(cur => {
      const idx = CYCLE.indexOf(cur)
      return CYCLE[(idx + 1) % CYCLE.length]
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
