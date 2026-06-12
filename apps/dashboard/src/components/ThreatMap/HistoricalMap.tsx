import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { LogEntry, ThreatLevel } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, levelColor } from '../../lib/chartTheme'

type GeoEntry = LogEntry & { lat: number; lon: number }

interface GeoCluster {
  lat: number
  lon: number
  count: number
  worstLevel: ThreatLevel
  countries: string[]
  topIps: string[]
}

const LEVEL_ORDER: Record<ThreatLevel, number> = { critical: 3, warning: 2, suspicious: 1, normal: 0 }

function worstLevel(entries: GeoEntry[]): ThreatLevel {
  return entries.reduce<ThreatLevel>((best, e) =>
    LEVEL_ORDER[e.threat_level] > LEVEL_ORDER[best] ? e.threat_level : best,
    'normal'
  )
}

function clusterByGeo(entries: GeoEntry[], precision = 1): GeoCluster[] {
  const buckets = new Map<string, GeoEntry[]>()
  for (const e of entries) {
    const key = `${e.lat.toFixed(precision)},${e.lon.toFixed(precision)}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(e)
    else buckets.set(key, [e])
  }

  return Array.from(buckets.entries()).map(([key, group]) => {
    const [lat, lon] = key.split(',').map(Number)
    const ipCounts = new Map<string, number>()
    const countries = new Set<string>()
    for (const e of group) {
      ipCounts.set(e.ip, (ipCounts.get(e.ip) ?? 0) + 1)
      if (e.country) countries.add(e.country)
    }
    const topIps = [...ipCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip]) => ip)

    return {
      lat,
      lon,
      count: group.length,
      worstLevel: worstLevel(group),
      countries: [...countries].slice(0, 3),
      topIps,
    }
  })
}

interface Props {
  entries: LogEntry[]
  loading: boolean
}

export default function HistoricalMap({ entries, loading }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = chartTheme(dark)

  const geoEntries = useMemo<GeoEntry[]>(
    () => entries.filter((e): e is GeoEntry => e.lat !== null && e.lon !== null),
    [entries],
  )

  const clusters = useMemo(() => clusterByGeo(geoEntries), [geoEntries])

  const maxCount = useMemo(() => Math.max(1, ...clusters.map(c => c.count)), [clusters])

  return (
    <MapContainer
      center={[20, 0]}
      zoom={3}
      minZoom={2}
      style={{ width: '100%', height: '100%', background: dark ? '#0a0f1e' : '#dce6ee' }}
      zoomControl
      attributionControl={false}
    >
      <TileLayer
        key={theme}
        url={`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`}
        subdomains="abcd"
        maxZoom={19}
      />

      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <span className="text-sm text-fg">Loading...</span>
        </div>
      )}

      {clusters.map((c, i) => {
        const color = levelColor(t, c.worstLevel)
        const radius = 6 + Math.sqrt(c.count / maxCount) * 28
        const isHot = c.worstLevel === 'critical' || c.worstLevel === 'warning'

        return (
          <CircleMarker
            key={i}
            center={[c.lat, c.lon]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: isHot ? 0.75 : 0.45,
              color: color,
              weight: isHot ? 1.5 : 0.5,
              opacity: 0.5,
            }}
          >
            <Popup>
              <div className="min-w-48 font-mono text-xs leading-relaxed">
                <span
                  className="mb-1.5 block text-[11px] font-bold tracking-widest"
                  style={{ color }}
                >
                  {c.worstLevel.toUpperCase()} CLUSTER
                </span>
                <div className="mb-1">
                  <span className="mr-2 inline-block w-16 text-dim">Requests</span>
                  <span className="font-bold">{c.count.toLocaleString()}</span>
                </div>
                {c.countries.length > 0 && (
                  <div className="mb-1">
                    <span className="mr-2 inline-block w-16 text-dim">Countries</span>
                    {c.countries.join(', ')}
                  </div>
                )}
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-dim">Top IPs</div>
                {c.topIps.map(ip => (
                  <div key={ip} className="text-[11px] text-fg">{ip}</div>
                ))}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
