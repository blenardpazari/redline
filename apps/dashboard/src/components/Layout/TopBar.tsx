import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useServer } from '../../context/ServerContext'
import { useTheme } from '../../context/ThemeContext'
import { IconLogOut, IconMoon, IconServer, IconSun } from '../ui/icons'
import Select from '../ui/Select'

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
        <Select
          value={String(selectedServerId ?? '')}
          onChange={(v) => setSelectedServerId(v === '' ? null : Number(v))}
          className="h-9 rounded-md border border-border bg-surface text-[13px] font-medium text-fg outline-none"
          icon={<IconServer size={13} />}
          allowHTML
          options={[
            { value: '', label: 'All sites' },
            ...servers.map((s) => {
              const dot = s.status === 'online'
                ? '<span style="color:var(--ok)">●</span>'
                : '<span style="color:var(--dim)">○</span>'
              return {
                value: String(s.id),
                label: `● ${s.name}`,
                customLabel: `${dot} ${s.name}`,
              }
            }),
          ]}
        />
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
