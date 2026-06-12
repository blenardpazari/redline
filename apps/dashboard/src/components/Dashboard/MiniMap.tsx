import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { LogEntry, ThreatLevel } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, levelColor } from '../../lib/chartTheme'

type GeoEntry = LogEntry & { lat: number; lon: number }

const LEVEL_RADIUS: Record<ThreatLevel, number> = {
  critical: 8, warning: 6, suspicious: 4, normal: 2,
}

interface Props {
  entries: LogEntry[]
}

export default function MiniMap({ entries }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = chartTheme(dark)

  const geo = useMemo<GeoEntry[]>(
    () => entries.filter((e): e is GeoEntry => e.lat !== null && e.lon !== null).slice(0, 200),
    [entries],
  )

  return (
    <div className="h-80 w-full overflow-hidden rounded-b-lg">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%', background: dark ? '#0a0f1e' : '#dce6ee' }}
      >
        <TileLayer
          key={theme}
          url={`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`}
          subdomains="abcd"
          maxZoom={19}
        />
        {geo.map(e => (
          <CircleMarker
            key={e.id}
            center={[e.lat, e.lon]}
            radius={LEVEL_RADIUS[e.threat_level]}
            pathOptions={{
              fillColor: levelColor(t, e.threat_level),
              fillOpacity: e.threat_level === 'normal' ? 0.4 : 0.85,
              color: 'transparent',
              weight: 0,
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
