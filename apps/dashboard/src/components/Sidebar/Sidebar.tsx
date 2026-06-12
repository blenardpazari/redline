import { NavLink } from 'react-router-dom'
import {
  IconActivity, IconBell, IconChart, IconGlobe, IconGrid, IconList,
  IconPlug, IconServer, IconSettings, IconShield, IconSparkles, IconUsers, IconInfo,
} from '../ui/icons'

function IconCluster({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
      <path d="M12 7v4m0 0l-5 6m5-6l5 6" />
    </svg>
  )
}

function IconX({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

const NAV = [
  {
    section: 'Monitor',
    items: [
      { label: 'Overview',   to: '/',           Icon: IconGrid },
      { label: 'Live Logs',  to: '/logs',       Icon: IconList },
      { label: 'Threat Map', to: '/map',        Icon: IconGlobe },
    ],
  },
  {
    section: 'Analyze',
    items: [
      { label: 'Analytics',  to: '/analytics',  Icon: IconChart },
      { label: 'Threats',    to: '/breakdown',  Icon: IconShield },
      { label: 'Insights',   to: '/insights',   Icon: IconSparkles },
      { label: 'Clustering', to: '/clustering', Icon: IconCluster },
    ],
  },
  {
    section: 'Manage',
    items: [
      { label: 'Alerts',     to: '/alerts',     Icon: IconBell },
      { label: 'Sites',      to: '/sites',      Icon: IconServer },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Settings',    to: '/settings',    Icon: IconSettings },
      { label: 'Integrations', to: '/integrations', Icon: IconPlug },
      { label: 'Users',       to: '/users',       Icon: IconUsers },
      { label: 'System',      to: '/health',      Icon: IconActivity },
    ],
  },
  {
    section: 'Project',
    items: [
      { label: 'About',       to: '/about',       Icon: IconInfo },
    ],
  },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {NAV.map(({ section, items }) => (
        <div key={section} className="mb-5">
          <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-dim">
            {section}
          </div>
          {items.map(({ label, to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

interface Props {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-white shadow-sm">
            RL
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Redline</div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-dim">Console</div>
          </div>
        </div>
        <NavItems />
        <div className="border-t border-border px-3 py-3 space-y-0.5">
          <div className="px-3 py-1.5 text-[11px] text-dim space-y-0.5">
            <div className="font-medium text-muted">Redline {import.meta.env.VITE_APP_VERSION ?? 'dev'}</div>
            <div>By{' '}
              <a href="https://github.com/blenardpazari" target="_blank" rel="noopener noreferrer" className="text-muted underline hover:text-fg transition-colors">Blenard Pazari</a>
            </div>
          </div>
          <a href="https://github.com/blenardpazari/redline" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            GitHub
          </a>
          <a href="https://github.com/blenardpazari/redline/issues" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Issues
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[1200] flex w-72 flex-col border-r border-border bg-surface transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-white shadow-sm">
              RL
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Redline</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-dim">Console</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
          >
            <IconX size={18} />
          </button>
        </div>
        <NavItems onNavigate={onClose} />
        <div className="border-t border-border px-3 py-3 space-y-0.5">
          <div className="px-3 py-1.5 text-[11px] text-dim space-y-0.5">
            <div className="font-medium text-muted">Redline {import.meta.env.VITE_APP_VERSION ?? 'dev'}</div>
            <div>By{' '}
              <a href="https://github.com/blenardpazari" target="_blank" rel="noopener noreferrer" className="text-muted underline hover:text-fg transition-colors">Blenard Pazari</a>
            </div>
          </div>
          <a href="https://github.com/blenardpazari/redline" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            GitHub
          </a>
          <a href="https://github.com/blenardpazari/redline/issues" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Issues
          </a>
        </div>
      </aside>
    </>
  )
}
