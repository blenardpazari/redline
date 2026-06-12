import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LogEntry, Server, ThreatLevel } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, levelColor } from '../../lib/chartTheme'
import ArcOverlay, { buildArcs } from '../ThreatMap/ArcOverlay'

type GeoEntry = LogEntry & { lat: number; lon: number }
type GeoServer = Server & { lat: number; lon: number }

const LEVEL_RADIUS: Record<ThreatLevel, number> = {
  critical: 8, warning: 6, suspicious: 4, normal: 2,
}

const ATTACK_LEVELS = new Set<string>(['critical', 'warning', 'suspicious'])

function makeServerIcon() {
  const html = `
    <div style="position:relative;width:28px;height:28px">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:rgba(79,142,247,0.15);border:1.5px solid rgba(79,142,247,0.6);
        animation:srvp 2.2s ease-out infinite;
      "></div>
      <div style="
        position:absolute;inset:5px;border-radius:50%;
        background:#1a2440;border:1.5px solid #4f8ef7;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 7px rgba(79,142,247,0.5);
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
          <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
      </div>
    </div>
    <style>
      @keyframes srvp {
        0%   { transform:scale(1);   opacity:0.9 }
        70%  { transform:scale(2);   opacity:0   }
        100% { transform:scale(2);   opacity:0   }
      }
    </style>
  `
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
}

const SERVER_ICON = makeServerIcon()

interface Props {
  entries: LogEntry[]
  servers?: Server[]
}

export default function MiniMap({ entries, servers = [] }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = chartTheme(dark)

  const geo = useMemo<GeoEntry[]>(
    () => entries.filter((e): e is GeoEntry => e.lat !== null && e.lon !== null).slice(0, 200),
    [entries],
  )

  const geoServers = useMemo<GeoServer[]>(
    () => servers.filter((s): s is GeoServer => s.lat !== null && s.lon !== null),
    [servers],
  )

  const arcs = useMemo(
    () => buildArcs(geo, geoServers, (level) => levelColor(t, level as ThreatLevel), ATTACK_LEVELS),
    [geo, geoServers, t],
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

        <ArcOverlay arcs={arcs} />

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

        {geoServers.map(s => (
          <Marker
            key={`srv-${s.id}`}
            position={[s.lat, s.lon]}
            icon={SERVER_ICON}
            zIndexOffset={1000}
          />
        ))}
      </MapContainer>
    </div>
  )
}
