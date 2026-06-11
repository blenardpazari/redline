import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './Sidebar.module.css'

const NAV = [
  {
    section: 'Core',
    items: [
      { label: 'Live Feed',    to: '/' },
      { label: 'Threat Map',   to: '/map' },
      { label: 'Log Explorer', to: '/logs' },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { label: 'Analytics',         to: '/analytics' },
      { label: 'Threat Breakdown',  to: '/breakdown' },
      { label: 'ML Insights',       to: '/insights' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Connectors',     to: '/connectors' },
      { label: 'Alert Settings', to: '/settings' },
    ],
  },
]

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>Redline</div>
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
