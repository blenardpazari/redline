import { useMemo } from 'react'
import { GoogleMap, HeatmapLayer, Marker, useLoadScript } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'
import type { LogEntry, ThreatLevel } from '../../types'
import styles from './ThreatMap.module.css'

const LIBRARIES: Libraries = ['visualization']

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#0a0f1e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0f1e' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111827' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  ],
}

const CENTER: google.maps.LatLngLiteral = { lat: 20, lng: 0 }

const LEVEL_COLOR: Record<ThreatLevel, string> = {
  critical: '#ef4444',
  warning: '#f97316',
  suspicious: '#eab308',
  normal: '#22c55e',
}

const LEVEL_SCALE: Record<ThreatLevel, number> = {
  critical: 8, warning: 6, suspicious: 5, normal: 3,
}

type GeoEntry = LogEntry & { lat: number; lon: number }

interface Props {
  entries: LogEntry[]
}

export default function ThreatMap({ entries }: Props) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
  })

  const geoEntries = useMemo<GeoEntry[]>(
    () => entries.filter((e): e is GeoEntry => e.lat !== null && e.lon !== null),
    [entries],
  )

  const heatmapData = useMemo(
    () => {
      if (!isLoaded) return []
      return geoEntries.map((e) => new window.google.maps.LatLng(e.lat, e.lon))
    },
    [geoEntries, isLoaded],
  )

  if (!isLoaded) return <div className={styles.loading}>Loading map…</div>

  return (
    <div className={styles.map}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={CENTER}
        zoom={2}
        options={MAP_OPTIONS}
      >
        {geoEntries.map((entry) => (
          <Marker
            key={entry.id}
            position={{ lat: entry.lat, lng: entry.lon }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: LEVEL_SCALE[entry.threat_level],
              fillColor: LEVEL_COLOR[entry.threat_level],
              fillOpacity: entry.threat_level === 'normal' ? 0.7 : 1,
              strokeColor: LEVEL_COLOR[entry.threat_level],
              strokeWeight: 0,
            }}
          />
        ))}
        {geoEntries.length >= 50 && (
          <HeatmapLayer
            data={heatmapData}
            options={{ radius: 30, opacity: 0.5 }}
          />
        )}
      </GoogleMap>
    </div>
  )
}
