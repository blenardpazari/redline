import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { LogEntry, ThreatLevel } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, levelColor } from '../../lib/chartTheme'

const LEVEL_RADIUS: Record<ThreatLevel, number> = {
  critical: 10, warning: 7, suspicious: 5, normal: 3,
}

type GeoEntry = LogEntry & { lat: number; lon: number; final_score?: number | null }

interface Props {
  entries: LogEntry[]
}

export default function ThreatMap({ entries }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = chartTheme(dark)

  const geoEntries = useMemo<GeoEntry[]>(
    () => entries
      .filter((e): e is GeoEntry => e.lat !== null && e.lon !== null)
      .slice(0, 300),
    [entries],
  )

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
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

      {geoEntries.map((entry) => {
        const color = levelColor(t, entry.threat_level)
        return (
          <CircleMarker
            key={entry.id}
            center={[entry.lat, entry.lon]}
            radius={LEVEL_RADIUS[entry.threat_level]}
            pathOptions={{
              fillColor: color,
              fillOpacity: entry.threat_level === 'normal' ? 0.55 : 0.9,
              color: entry.threat_level === 'critical' ? color : 'transparent',
              weight: 2,
              opacity: 0.4,
            }}
          >
            <Popup>
              <div className="min-w-44 font-mono text-xs leading-relaxed">
                <span className="mb-1 block text-[11px] font-bold tracking-widest" style={{ color }}>
                  {entry.threat_level.toUpperCase()}
                </span>
                <div><span className="mr-2 inline-block w-14 text-dim">IP</span>{entry.ip}</div>
                <div><span className="mr-2 inline-block w-14 text-dim">Country</span>{entry.country ?? '—'}</div>
                <div><span className="mr-2 inline-block w-14 text-dim">Score</span>{entry.final_score != null ? entry.final_score.toFixed(1) : '—'}</div>
                <div className="break-all"><span className="mr-2 inline-block w-14 text-dim">Path</span>{entry.path}</div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
