import { useEffect, useState } from 'react'
import ConnectorCard from '../components/Connectors/ConnectorCard'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { Connector } from '../types'
import styles from './Connectors.module.css'

export default function Connectors() {
  const [connectors, setConnectors] = useState<Connector[]>([])

  useEffect(() => {
    api.get<Connector[]>('/connectors').then(setConnectors).catch(() => undefined)
  }, [])

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Connectors</h1>
          <span className={styles.sub}>Log source integrations</span>
        </div>
        <div className={styles.grid}>
          {connectors.map((c) => <ConnectorCard key={c.id} connector={c} />)}
        </div>
      </div>
    </Layout>
  )
}
