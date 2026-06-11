import Sidebar from '../Sidebar/Sidebar'
import styles from './Layout.module.css'

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
