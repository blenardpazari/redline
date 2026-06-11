import { NavLink } from 'react-router-dom'
import {
  IconActivity, IconBell, IconChart, IconGlobe, IconGrid, IconList,
  IconServer, IconSettings, IconShield, IconSparkles, IconUsers,
} from '../ui/icons'

const NAV = [
  {
    section: 'Monitor',
    items: [
      { label: 'Overview',  to: '/',          Icon: IconGrid },
      { label: 'Live Logs', to: '/logs',      Icon: IconList },
      { label: 'Threat Map', to: '/map',      Icon: IconGlobe },
    ],
  },
  {
    section: 'Analyze',
    items: [
      { label: 'Analytics', to: '/analytics', Icon: IconChart },
      { label: 'Threats',   to: '/breakdown', Icon: IconShield },
      { label: 'Insights',  to: '/insights',  Icon: IconSparkles },
    ],
  },
  {
    section: 'Manage',
    items: [
      { label: 'Alerts',    to: '/alerts',    Icon: IconBell },
      { label: 'Sites',     to: '/sites',     Icon: IconServer },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Settings',  to: '/settings',  Icon: IconSettings },
      { label: 'Users',     to: '/users',     Icon: IconUsers },
      { label: 'System',    to: '/health',    Icon: IconActivity },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-white shadow-sm">
          RL
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Redline</div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-dim">Console</div>
        </div>
      </div>

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

      <div className="border-t border-border px-4 py-3 text-[11px] text-dim">
        Redline Security Monitor
      </div>
    </aside>
  )
}
