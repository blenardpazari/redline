import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LogEntry, Server, ThreatLevel } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { chartTheme, levelColor } from '../../lib/chartTheme'

const LEVEL_RADIUS: Record<ThreatLevel, number> = {
  critical: 10, warning: 7, suspicious: 5, normal: 3,
}

const ATTACK_LEVELS = new Set<ThreatLevel>(['critical', 'warning', 'suspicious'])

function makeServerIcon(name: string) {
  const html = `
    <div style="position:relative;width:40px;height:40px">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:rgba(79,142,247,0.18);border:2px solid rgba(79,142,247,0.7);
        animation:srv-pulse 2.2s ease-out infinite;
      "></div>
      <div style="
        position:absolute;inset:6px;border-radius:50%;
        background:#1a2440;border:2px solid #4f8ef7;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 10px rgba(79,142,247,0.5);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
          <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
      </div>
      <div style="
        position:absolute;top:42px;left:50%;transform:translateX(-50%);
        background:#1a2440;border:1px solid rgba(79,142,247,0.5);border-radius:4px;
        color:#4f8ef7;font-size:10px;font-family:monospace;font-weight:600;
        white-space:nowrap;padding:1px 5px;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      ">${name}</div>
    </div>
    <style>
      @keyframes srv-pulse {
        0%   { transform:scale(1);   opacity:0.9 }
        70%  { transform:scale(1.9); opacity:0   }
        100% { transform:scale(1.9); opacity:0   }
      }
    </style>
  `
  return L.divIcon({ html, className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -24] })
}

type GeoEntry = LogEntry & { lat: number; lon: number }
type GeoServer = Server & { lat: number; lon: number }

// ---------------------------------------------------------------------------
// Arc animation overlay
// ---------------------------------------------------------------------------

interface Arc {
  id: number
  fromLat: number
  fromLon: number
  toLat: number
  toLon: number
  color: string
  born: number
}

const ARC_DURATION = 2500  // ms for one trip
const ARC_FADE = 4000      // ms before it disappears

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

// Great-circle midpoint lifted for a visual arc
function arcPoint(lat1: number, lon1: number, lat2: number, lon2: number, t: number) {
  const lat = lerp(lat1, lat2, t)
  const lon = lerp(lon1, lon2, t)
  const lift = Math.sin(Math.PI * t) * Math.min(15, Math.abs(lat2 - lat1) + Math.abs(lon2 - lon1)) * 0.4
  return { lat: lat + lift, lon }
}

function ArcOverlay({ arcs }: { arcs: Arc[] }) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const container = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:500'
    container.appendChild(canvas)
    canvasRef.current = canvas

    function resize() {
      const r = container.getBoundingClientRect()
      canvas.width = r.width
      canvas.height = r.height
    }
    resize()
    map.on('resize move zoom', resize)

    return () => {
      map.off('resize move zoom', resize)
      canvas.remove()
      cancelAnimationFrame(rafRef.current)
    }
  }, [map])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function draw() {
      const ctx = canvas!.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      const now = Date.now()
      for (const arc of arcs) {
        const age = now - arc.born
        if (age > ARC_FADE) continue

        const opacity = age < ARC_DURATION ? 1 : 1 - (age - ARC_DURATION) / (ARC_FADE - ARC_DURATION)

        // draw the static faint trail
        ctx.beginPath()
        ctx.globalAlpha = opacity * 0.15
        ctx.strokeStyle = arc.color
        ctx.lineWidth = 1
        for (let i = 0; i <= 60; i++) {
          const t = i / 60
          const p = arcPoint(arc.fromLat, arc.fromLon, arc.toLat, arc.toLon, t)
          const px = map.latLngToContainerPoint([p.lat, p.lon])
          i === 0 ? ctx.moveTo(px.x, px.y) : ctx.lineTo(px.x, px.y)
        }
        ctx.stroke()

        // draw the moving dot
        if (age < ARC_DURATION) {
          const t = age / ARC_DURATION
          const p = arcPoint(arc.fromLat, arc.fromLon, arc.toLat, arc.toLon, t)
          const px = map.latLngToContainerPoint([p.lat, p.lon])
          ctx.beginPath()
          ctx.globalAlpha = opacity
          ctx.fillStyle = arc.color
          ctx.shadowColor = arc.color
          ctx.shadowBlur = 8
          ctx.arc(px.x, px.y, 3.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [arcs, map])

  return null
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  entries: LogEntry[]
  servers?: Server[]
}

export default function ThreatMap({ entries, servers = [] }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = chartTheme(dark)

  const geoEntries = useMemo<GeoEntry[]>(
    () => entries.filter((e): e is GeoEntry => e.lat !== null && e.lon !== null).slice(0, 300),
    [entries],
  )

  const geoServers = useMemo<GeoServer[]>(
    () => servers.filter((s): s is GeoServer => s.lat !== null && s.lon !== null),
    [servers],
  )

  // Build arcs: recent attack entries → nearest server
  const arcs = useMemo<Arc[]>(() => {
    if (geoServers.length === 0) return []
    const cutoff = Date.now() - ARC_FADE
    return geoEntries
      .filter(e => ATTACK_LEVELS.has(e.threat_level) && new Date(e.timestamp).getTime() > cutoff)
      .map(e => {
        // pick closest server by simple distance
        const srv = geoServers.reduce((best, s) => {
          const d = Math.hypot(s.lat - e.lat, s.lon - e.lon)
          const bd = Math.hypot(best.lat - e.lat, best.lon - e.lon)
          return d < bd ? s : best
        })
        return {
          id: e.id,
          fromLat: e.lat,
          fromLon: e.lon,
          toLat: srv.lat,
          toLon: srv.lon,
          color: levelColor(t, e.threat_level),
          born: new Date(e.timestamp).getTime(),
        }
      })
  }, [geoEntries, geoServers, t])

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

      <ArcOverlay arcs={arcs} />

      {/* Attacker dots */}
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
                <div><span className="mr-2 inline-block w-14 text-dim">IP</span>
                  <span className="cursor-pointer underline-offset-2 hover:text-accent hover:underline"
                    onClick={() => { window.location.href = `/ip/${entry.ip}` }}>{entry.ip}</span></div>
                <div><span className="mr-2 inline-block w-14 text-dim">Country</span>{entry.country ?? '—'}</div>
                <div><span className="mr-2 inline-block w-14 text-dim">Score</span>{entry.threat_score.toFixed(1)}</div>
                <div className="break-all"><span className="mr-2 inline-block w-14 text-dim">Path</span>{entry.path}</div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Server / datacenter markers */}
      {geoServers.map(s => (
        <Marker
          key={`srv-${s.id}`}
          position={[s.lat, s.lon]}
          icon={makeServerIcon(s.name)}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="min-w-36 font-mono text-xs leading-relaxed">
              <span className="mb-1 block text-[11px] font-bold tracking-widest text-[#4f8ef7]">DATACENTER</span>
              <div><span className="mr-2 inline-block w-14 text-dim">Name</span>{s.name}</div>
              <div><span className="mr-2 inline-block w-14 text-dim">IP</span>{s.public_ip ?? '—'}</div>
              <div><span className="mr-2 inline-block w-14 text-dim">Type</span>{s.source_type}</div>
              <div><span className="mr-2 inline-block w-14 text-dim">Status</span>
                <span style={{ color: s.status === 'online' ? '#4ade80' : s.status === 'offline' ? '#f87171' : '#facc15' }}>
                  {s.status}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
