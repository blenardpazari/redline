import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import IpHeader from '../components/IpInspector/IpHeader'
import IpStats from '../components/IpInspector/IpStats'
import RequestsTable from '../components/IpInspector/RequestsTable'
import ScoreTimeline from '../components/IpInspector/ScoreTimeline'
import Layout from '../components/Layout/Layout'
import { IconArrowLeft } from '../components/ui/icons'
import { api } from '../lib/api'
import type { IpProfile } from '../types'

export default function IpInspector() {
  const { ip } = useParams<{ ip: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<IpProfile | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!ip) return
    api.get<IpProfile>(`/ip/${encodeURIComponent(ip)}`)
      .then(setProfile)
      .catch(() => setNotFound(true))
  }, [ip])

  if (notFound) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-sm text-muted">
          No data for {ip}.
          <button
            className="mt-3 flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:border-border-strong hover:text-fg"
            onClick={() => navigate(-1)}
          >
            <IconArrowLeft size={14} /> Go back
          </button>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return <Layout><div className="py-24 text-center text-sm text-dim">Loading…</div></Layout>
  }

  return (
    <Layout>
      <div className="space-y-4">
        <button
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
          onClick={() => navigate(-1)}
        >
          <IconArrowLeft size={14} /> Back
        </button>
        <IpHeader profile={profile} />
        <IpStats profile={profile} />
        <ScoreTimeline requests={profile.requests} />
        <RequestsTable requests={profile.requests} />
      </div>
    </Layout>
  )
}
