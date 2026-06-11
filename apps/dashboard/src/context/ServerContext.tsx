import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../lib/api'
import type { Server } from '../types'

interface ServerContextValue {
  servers: Server[]
  selectedServerId: number | null
  setSelectedServerId: (id: number | null) => void
  reload: () => void
}

const ServerContext = createContext<ServerContextValue>({
  servers: [],
  selectedServerId: null,
  setSelectedServerId: () => {},
  reload: () => {},
})

export function ServerProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<Server[]>([])
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null)

  function load() {
    api.get<Server[]>('/servers').then(setServers).catch(() => {})
  }

  useEffect(() => { load() }, [])

  return (
    <ServerContext.Provider value={{ servers, selectedServerId, setSelectedServerId, reload: load }}>
      {children}
    </ServerContext.Provider>
  )
}

export function useServer() {
  return useContext(ServerContext)
}
