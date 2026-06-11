import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useServer } from '../../context/ServerContext'
import { useTheme } from '../../context/ThemeContext'
import { IconChevronDown, IconLogOut, IconMoon, IconServer, IconSun } from '../ui/icons'

export default function TopBar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { servers, selectedServerId, setSelectedServerId } = useServer()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/85 px-6 backdrop-blur">
      {servers.length > 0 && (
        <div className="relative flex items-center">
          <IconServer size={14} className="pointer-events-none absolute left-3 text-dim" />
          <select
            value={selectedServerId ?? ''}
            onChange={e => setSelectedServerId(e.target.value === '' ? null : Number(e.target.value))}
            className="h-9 appearance-none rounded-md border border-border bg-surface pl-8 pr-8 text-[13px] font-medium text-fg outline-none transition-colors hover:border-border-strong focus:border-accent"
          >
            <option value="">All sites</option>
            {servers.map(s => (
              <option key={s.id} value={s.id}>
                {s.status === 'online' ? '● ' : '○ '}{s.name}
              </option>
            ))}
          </select>
          <IconChevronDown size={14} className="pointer-events-none absolute right-2.5 text-dim" />
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
      </button>

      <div className="h-6 w-px bg-border" />

      <button
        onClick={handleLogout}
        className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        <IconLogOut size={15} />
        Sign out
      </button>
    </header>
  )
}
