import { NavLink } from 'react-router-dom'
import {
  IconActivity, IconBell, IconChart, IconGlobe, IconGrid, IconList,
  IconServer, IconSettings, IconShield, IconSparkles, IconUsers,
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
      { label: 'Settings',   to: '/settings',   Icon: IconSettings },
      { label: 'Users',      to: '/users',      Icon: IconUsers },
      { label: 'System',     to: '/health',     Icon: IconActivity },
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
        <div className="border-t border-border px-4 py-3 text-[11px] text-dim">
          Redline Security Monitor
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
        <div className="border-t border-border px-4 py-3 text-[11px] text-dim">
          Redline Security Monitor
        </div>
      </aside>
    </>
  )
}
