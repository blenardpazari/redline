import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useServer } from '../../context/ServerContext'
import styles from './Sidebar.module.css'

const NAV = [
  {
    section: 'Core',
    items: [
      { label: 'Live Feed',     to: '/' },
      { label: 'Threat Map',   to: '/map' },
      { label: 'Log Explorer', to: '/logs' },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { label: 'Analytics',        to: '/analytics' },
      { label: 'Threat Breakdown', to: '/breakdown' },
      { label: 'ML Insights',      to: '/insights' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Alert History', to: '/alerts' },
      { label: 'Sites',         to: '/sites' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Alert Settings', to: '/settings' },
      { label: 'Users',          to: '/users' },
      { label: 'Health',         to: '/health' },
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
      <div className={styles.logo}>Redline</div>

      {servers.length > 0 && (
        <div className={styles.serverSelect}>
          <span className={styles.serverLabel}>Site</span>
          <select
            className={styles.serverDropdown}
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

      {NAV.map(({ section, items }) => (
        <div key={section} className={styles.section}>
          <span className={styles.sectionLabel}>{section}</span>
          {items.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      ))}
      <button className={styles.logout} onClick={handleLogout}>Logout</button>
    </aside>
  )
}
