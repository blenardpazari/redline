import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import IpHeader from '../components/IpInspector/IpHeader'
import IpStats from '../components/IpInspector/IpStats'
import RequestsTable from '../components/IpInspector/RequestsTable'
import ScoreTimeline from '../components/IpInspector/ScoreTimeline'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import type { IpProfile } from '../types'
import styles from './IpInspector.module.css'

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
        <div className={styles.empty}>
          No data for {ip}.&nbsp;
          <button className={styles.back} onClick={() => navigate(-1)}>Go back</button>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return <Layout><div className={styles.empty}>Loading…</div></Layout>
  }

  return (
    <Layout>
      <div className={styles.page}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>
        <IpHeader profile={profile} />
        <IpStats profile={profile} />
        <ScoreTimeline requests={profile.requests} />
        <RequestsTable requests={profile.requests} />
      </div>
    </Layout>
  )
}
