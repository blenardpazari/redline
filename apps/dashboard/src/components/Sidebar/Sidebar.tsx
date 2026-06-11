import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useServer } from '../../context/ServerContext'
import styles from './Sidebar.module.css'

const NAV = [
  {
    section: 'Monitor',
    items: [
      { label: 'Overview',  to: '/',          icon: '⊡' },
      { label: 'Live Logs', to: '/logs',       icon: '≡' },
      { label: 'Map',       to: '/map',        icon: '◎' },
    ],
  },
  {
    section: 'Analyze',
    items: [
      { label: 'Analytics', to: '/analytics',  icon: '∿' },
      { label: 'Threats',   to: '/breakdown',  icon: '◈' },
      { label: 'Insights',  to: '/insights',   icon: '◇' },
    ],
  },
  {
    section: 'Manage',
    items: [
      { label: 'Alerts',    to: '/alerts',     icon: '⚐' },
      { label: 'Sites',     to: '/sites',      icon: '⊞' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { label: 'Settings',  to: '/settings',   icon: '⚙' },
      { label: 'Users',     to: '/users',      icon: '◉' },
      { label: 'System',    to: '/health',     icon: '♥' },
    ],
  },
]

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { servers, selectedServerId, setSelectedServerId } = useServer()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <div className={styles.logoMark}>RL</div>
        <span className={styles.logoText}>Redline</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ section, items }) => (
          <div key={section} className={styles.section}>
            <span className={styles.sectionLabel}>{section}</span>
            {items.map(({ label, to, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.active}` : styles.link
                }
              >
                <span className={styles.icon}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {servers.length > 0 && (
          <div className={styles.siteSelect}>
            <span className={styles.siteLabel}>Site</span>
            <select
              className={styles.siteDropdown}
              value={selectedServerId ?? ''}
              onChange={e => setSelectedServerId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">All sites</option>
              {servers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.status === 'online' ? '● ' : '○ '}{s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button className={styles.logout} onClick={handleLogout}>Sign out</button>
      </div>
    </aside>
  )
}
