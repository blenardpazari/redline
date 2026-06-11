import { useState } from 'react'
import Sidebar from '../Sidebar/Sidebar'
import TopBar from './TopBar'

interface Props {
  children: React.ReactNode
  /** Full-bleed content (no padding) — used by the map. */
  full?: boolean
}

export default function Layout({ children, full = false }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-col md:pl-60">
        <TopBar onMenuOpen={() => setMobileOpen(true)} />
        <main className={full ? 'relative flex-1' : 'flex-1 p-4 md:p-6'}>{children}</main>
      </div>
    </div>
  )
}
