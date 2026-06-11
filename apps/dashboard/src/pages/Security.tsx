import { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { api } from '../lib/api'
import { useServer } from '../context/ServerContext'
import type { GeoBlock, RateBlock } from '../types'
import styles from './Security.module.css'

const COUNTRY_NAMES: Record<string, string> = {
  AF:'Afghanistan',AL:'Albania',DZ:'Algeria',AR:'Argentina',AU:'Australia',AT:'Austria',
  AZ:'Azerbaijan',BD:'Bangladesh',BY:'Belarus',BE:'Belgium',BR:'Brazil',BG:'Bulgaria',
  CA:'Canada',CL:'Chile',CN:'China',CO:'Colombia',HR:'Croatia',CZ:'Czech Republic',
  DK:'Denmark',EG:'Egypt',FI:'Finland',FR:'France',GE:'Georgia',DE:'Germany',
  GH:'Ghana',GR:'Greece',HK:'Hong Kong',HU:'Hungary',IN:'India',ID:'Indonesia',
  IR:'Iran',IQ:'Iraq',IE:'Ireland',IL:'Israel',IT:'Italy',JP:'Japan',JO:'Jordan',
  KZ:'Kazakhstan',KE:'Kenya',KP:'North Korea',KR:'South Korea',KW:'Kuwait',LB:'Lebanon',
  LY:'Libya',MY:'Malaysia',MX:'Mexico',MA:'Morocco',NL:'Netherlands',NZ:'New Zealand',
  NG:'Nigeria',NO:'Norway',PK:'Pakistan',PE:'Peru',PH:'Philippines',PL:'Poland',
  PT:'Portugal',QA:'Qatar',RO:'Romania',RU:'Russia',SA:'Saudi Arabia',RS:'Serbia',
  SG:'Singapore',ZA:'South Africa',ES:'Spain',SE:'Sweden',CH:'Switzerland',SY:'Syria',
  TW:'Taiwan',TH:'Thailand',TN:'Tunisia',TR:'Turkey',UA:'Ukraine',AE:'UAE',
  GB:'United Kingdom',US:'United States',UZ:'Uzbekistan',VN:'Vietnam',YE:'Yemen',
}

export default function Security() {
  const { servers, selectedServerId } = useServer()
  const [geoBlocks, setGeoBlocks] = useState<GeoBlock[]>([])
  const [rateBlocks, setRateBlocks] = useState<RateBlock[]>([])
  const [tab, setTab] = useState<'geo' | 'rate'>('geo')
  const [newCountry, setNewCountry] = useState('')
  const [geoServerId, setGeoServerId] = useState<number | ''>('')
  const [blockIp, setBlockIp] = useState('')
  const [blockServerId, setBlockServerId] = useState<number | ''>('')
  const [blockDuration, setBlockDuration] = useState(60)

  function loadGeo() {
    const q = selectedServerId ? `?server_id=${selectedServerId}` : ''
    api.get<GeoBlock[]>(`/geo-blocks${q}`).then(setGeoBlocks).catch(() => {})
  }
  function loadRate() {
    const q = selectedServerId ? `?server_id=${selectedServerId}` : ''
    api.get<RateBlock[]>(`/rate-limits${q}`).then(setRateBlocks).catch(() => {})
  }

  useEffect(() => { loadGeo(); loadRate() }, [selectedServerId])

  async function addGeoBlock(e: React.FormEvent) {
    e.preventDefault()
    if (!newCountry) return
    await api.post('/geo-blocks', {
      country_code: newCountry,
      server_id: geoServerId === '' ? null : geoServerId,
    })
    setNewCountry('')
    loadGeo()
  }

  async function removeGeoBlock(id: number) {
    await api.delete(`/geo-blocks/${id}`)
    loadGeo()
  }

  async function addRateBlock(e: React.FormEvent) {
    e.preventDefault()
    if (!blockIp) return
    await api.post('/rate-limits', {
      ip: blockIp,
      server_id: blockServerId === '' ? null : blockServerId,
      duration_minutes: blockDuration,
      reason: 'manual',
    })
    setBlockIp('')
    loadRate()
  }

  async function removeRateBlock(id: number) {
    await api.delete(`/rate-limits/${id}`)
    loadRate()
  }

  function timeLeft(expires: string) {
    const diff = new Date(expires).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const m = Math.floor(diff / 60000)
    return m > 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Security Rules</h1>
            <p className={styles.subtitle}>Geo-blocking and IP rate-limit controls</p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button className={tab === 'geo' ? styles.tabActive : styles.tab} onClick={() => setTab('geo')}>
            🌍 Geo Blocking <span className={styles.badge}>{geoBlocks.length}</span>
          </button>
          <button className={tab === 'rate' ? styles.tabActive : styles.tab} onClick={() => setTab('rate')}>
            🚫 Rate Limit Blocks <span className={styles.badge}>{rateBlocks.length}</span>
          </button>
        </div>

        {tab === 'geo' && (
          <div className={styles.panel}>
            <form onSubmit={addGeoBlock} className={styles.addRow}>
              <select className={styles.select} value={newCountry} onChange={e => setNewCountry(e.target.value)} required>
                <option value="">Select country…</option>
                {Object.entries(COUNTRY_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>
              <select className={styles.selectSm} value={geoServerId} onChange={e => setGeoServerId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">All servers</option>
                {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="submit" className={styles.addBtn}>Block Country</button>
            </form>

            {geoBlocks.length === 0 ? (
              <div className={styles.empty}>No geo-blocking rules. Traffic from all countries is allowed.</div>
            ) : (
              <div className={styles.list}>
                {geoBlocks.map(b => (
                  <div key={b.id} className={styles.rule}>
                    <div className={styles.ruleInfo}>
                      <span className={styles.code}>{b.country_code}</span>
                      <span className={styles.ruleName}>{COUNTRY_NAMES[b.country_code] ?? b.country_code}</span>
                      <span className={styles.ruleMeta}>
                        {b.server_id ? servers.find(s => s.id === b.server_id)?.name ?? `Server ${b.server_id}` : 'All servers'}
                        {' · '}{new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeGeoBlock(b.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'rate' && (
          <div className={styles.panel}>
            <form onSubmit={addRateBlock} className={styles.addRow}>
              <input className={styles.input} placeholder="IP address…" value={blockIp} onChange={e => setBlockIp(e.target.value)} required />
              <select className={styles.selectSm} value={blockServerId} onChange={e => setBlockServerId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">All servers</option>
                {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className={styles.durationRow}>
                <input type="number" className={styles.inputSm} value={blockDuration} onChange={e => setBlockDuration(Number(e.target.value))} min={1} max={10080} />
                <span className={styles.durationLabel}>min</span>
              </div>
              <button type="submit" className={styles.addBtn}>Block IP</button>
            </form>

            {rateBlocks.length === 0 ? (
              <div className={styles.empty}>No active IP blocks.</div>
            ) : (
              <div className={styles.list}>
                {rateBlocks.map(b => (
                  <div key={b.id} className={styles.rule}>
                    <div className={styles.ruleInfo}>
                      <span className={styles.code}>{b.ip}</span>
                      <span className={styles.ruleMeta}>
                        {b.reason} · expires in {timeLeft(b.expires_at)}
                        {' · '}{b.server_id ? servers.find(s => s.id === b.server_id)?.name ?? `Server ${b.server_id}` : 'All servers'}
                      </span>
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeRateBlock(b.id)}>Unblock</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
