import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useServer } from '../../context/ServerContext'
import { useTheme } from '../../context/ThemeContext'
import { IconLogOut, IconMoon, IconServer, IconSun } from '../ui/icons'

function IconMonitor({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  )
}
import Select from '../ui/Select'

function IconMenu({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function getTokenPayload(): { sub?: string; username?: string; role?: string; login_ip?: string } {
  try {
    const token = localStorage.getItem('redline_token')
    if (!token) return {}
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export default function TopBar({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { servers, selectedServerId, setSelectedServerId } = useServer()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const payload = getTokenPayload()
  const username = payload.sub ?? payload.username ?? '?'
  const role = payload.role ?? 'viewer'
  const loginIp = payload.login_ip

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-[1000] flex h-14 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur md:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg md:hidden"
        aria-label="Open menu"
      >
        <IconMenu size={18} />
      </button>

      {servers.length > 0 && (
        <Select
          value={String(selectedServerId ?? '')}
          onChange={(v) => setSelectedServerId(v === '' ? null : Number(v))}
          className="w-48"
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

      {/* Theme pill — desktop */}
      <div className="hidden items-center gap-0.5 rounded-md border border-border bg-surface p-0.5 md:flex">
        {([['system', <IconMonitor size={14} />], ['light', <IconSun size={14} />], ['dark', <IconMoon size={14} />]] as const).map(([t, icon]) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            title={t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded transition-colors ${
              theme === t ? 'bg-surface-2 text-fg shadow-sm' : 'text-dim hover:text-muted'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="hidden h-6 w-px bg-border md:block" />

      {/* Avatar + dropdown */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface pl-1.5 pr-2.5 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 font-mono text-[11px] font-bold text-accent">
            {initials(username)}
          </span>
          <span className="hidden max-w-[96px] truncate sm:block">{username}</span>
          <svg
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-border bg-surface shadow-lg">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 font-mono text-sm font-bold text-accent">
                {initials(username)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-fg">{username}</div>
                <div className="text-[11px] capitalize text-muted">{role}</div>
                {loginIp && (
                  <div className="text-[10px] text-dim font-mono mt-0.5">IP: {loginIp}</div>
                )}
              </div>
            </div>

            {/* Theme picker inside menu */}
            <div className="p-2 border-b border-border">
              <p className="mb-1.5 px-1 text-[11px] text-dim">Theme</p>
              <div className="flex gap-1">
                {([['system', <IconMonitor size={13} />, 'System'], ['light', <IconSun size={13} />, 'Light'], ['dark', <IconMoon size={13} />, 'Dark']] as const).map(([t, icon, label]) => (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); setMenuOpen(false) }}
                    className={`flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-md py-1.5 text-[11px] transition-colors ${
                      theme === t ? 'bg-surface-2 text-fg' : 'text-dim hover:text-muted'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-1">

              <button
                onClick={handleLogout}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-crit/80 transition-colors hover:bg-crit/8 hover:text-crit"
              >
                <IconLogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
