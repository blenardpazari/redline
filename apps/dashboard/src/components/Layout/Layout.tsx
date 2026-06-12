import { useState } from 'react'
import Sidebar from '../Sidebar/Sidebar'
import TopBar from './TopBar'
import AttackSimulator from '../Simulator/AttackSimulator'

interface Props {
  children: React.ReactNode
  /** Full-bleed content (no padding) — used by the map. */
  full?: boolean
}

export default function Layout({ children, full = false }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [simOpen, setSimOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-col md:pl-60">
        <TopBar onMenuOpen={() => setMobileOpen(true)} />
        <main className={full ? 'relative flex-1' : 'flex-1 p-4 md:p-6'}>{children}</main>
        {!full && (
          <footer className="px-4 py-3 md:px-6 border-t border-border/40">
            <p className="text-[11px] text-dim">
              Redline {import.meta.env.VITE_APP_VERSION ?? 'dev'} · Built by{' '}
              <span className="text-muted">Blenard Pazari</span>
              {' '}· © {new Date().getFullYear()} Anomalies
            </p>
          </footer>
        )}
      </div>

      {/* Floating simulator trigger */}
      {!simOpen && (
        <button
          onClick={() => setSimOpen(true)}
          title="Attack Simulator"
          className="fixed bottom-5 right-5 z-[1999] flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-muted shadow-lg transition-all hover:border-accent hover:text-accent hover:shadow-accent/20"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Simulator
        </button>
      )}

      {simOpen && <AttackSimulator onClose={() => setSimOpen(false)} />}
    </div>
  )
}
