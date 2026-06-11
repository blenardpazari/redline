import Sidebar from '../Sidebar/Sidebar'
import TopBar from './TopBar'

interface Props {
  children: React.ReactNode
  /** Full-bleed content (no padding) — used by the map. */
  full?: boolean
}

export default function Layout({ children, full = false }: Props) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Sidebar />
      <div className="flex min-h-screen flex-col pl-60">
        <TopBar />
        <main className={full ? 'relative flex-1' : 'flex-1 p-6'}>{children}</main>
      </div>
    </div>
  )
}
