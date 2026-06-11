import { useEffect, useState } from 'react'
import ConnectorCard from '../components/Connectors/ConnectorCard'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { Connector } from '../types'

export default function Connectors() {
  const [connectors, setConnectors] = useState<Connector[]>([])

  useEffect(() => {
    api.get<Connector[]>('/connectors').then(setConnectors).catch(() => undefined)
  }, [])

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Connectors</h1>
          <p className="text-sm text-muted">Log source integrations</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connectors.map((c) => <ConnectorCard key={c.id} connector={c} />)}
        </div>
      </div>
    </Layout>
  )
}
