import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

export interface Arc {
  id: number
  fromLat: number
  fromLon: number
  toLat: number
  toLon: number
  color: string
  born: number
}

export const ARC_DURATION = 2500
export const ARC_FADE = 4000

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

export function arcPoint(lat1: number, lon1: number, lat2: number, lon2: number, t: number) {
  const lat = lerp(lat1, lat2, t)
  const lon = lerp(lon1, lon2, t)
  const lift = Math.sin(Math.PI * t) * Math.min(15, Math.abs(lat2 - lat1) + Math.abs(lon2 - lon1)) * 0.4
  return { lat: lat + lift, lon }
}

export function buildArcs(
  geoEntries: { id: number; lat: number; lon: number; threat_level: string; timestamp: string }[],
  geoServers: { id: number; lat: number; lon: number }[],
  getColor: (level: string) => string,
  attackLevels: Set<string>,
): Arc[] {
  if (geoServers.length === 0) return []
  const cutoff = Date.now() - ARC_FADE
  return geoEntries
    .filter(e => attackLevels.has(e.threat_level) && new Date(e.timestamp).getTime() > cutoff)
    .map(e => {
      const srv = geoServers.reduce((best, s) => {
        return Math.hypot(s.lat - e.lat, s.lon - e.lon) < Math.hypot(best.lat - e.lat, best.lon - e.lon) ? s : best
      })
      return {
        id: e.id,
        fromLat: e.lat,
        fromLon: e.lon,
        toLat: srv.lat,
        toLon: srv.lon,
        color: getColor(e.threat_level),
        born: new Date(e.timestamp).getTime(),
      }
    })
}

export default function ArcOverlay({ arcs }: { arcs: Arc[] }) {
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
