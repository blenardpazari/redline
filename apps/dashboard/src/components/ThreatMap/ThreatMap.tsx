import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { LogEntry, ThreatLevel } from '../../types'
import styles from './ThreatMap.module.css'

const LEVEL_COLOR: Record<ThreatLevel, string> = {
  critical:   '#ef4444',
  warning:    '#f97316',
  suspicious: '#eab308',
  normal:     '#22c55e',
}

const LEVEL_RADIUS: Record<ThreatLevel, number> = {
  critical: 10, warning: 7, suspicious: 5, normal: 3,
}

type GeoEntry = LogEntry & { lat: number; lon: number }

interface Props {
  entries: LogEntry[]
}

export default function ThreatMap({ entries }: Props) {
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
      style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
      zoomControl
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {geoEntries.map((entry) => (
        <CircleMarker
          key={entry.id}
          center={[entry.lat, entry.lon]}
          radius={LEVEL_RADIUS[entry.threat_level]}
          pathOptions={{
            fillColor: LEVEL_COLOR[entry.threat_level],
            fillOpacity: entry.threat_level === 'normal' ? 0.55 : 0.9,
            color: entry.threat_level === 'critical' ? LEVEL_COLOR[entry.threat_level] : 'transparent',
            weight: 2,
            opacity: 0.4,
          }}
        >
          <Popup className="redline-popup">
            <div className={styles.popup}>
              <span
                className={styles.popupLevel}
                style={{ color: LEVEL_COLOR[entry.threat_level] }}
              >
                {entry.threat_level.toUpperCase()}
              </span>
              <div><span className={styles.popupLabel}>IP</span>{entry.ip}</div>
              <div><span className={styles.popupLabel}>Country</span>{entry.country ?? '—'}</div>
              <div><span className={styles.popupLabel}>Score</span>{entry.final_score != null ? entry.final_score.toFixed(1) : '—'}</div>
              <div><span className={styles.popupLabel}>Path</span>{entry.path}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
