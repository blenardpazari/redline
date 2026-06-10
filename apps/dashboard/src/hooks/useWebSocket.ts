import { useEffect, useRef } from 'react'
import type { WebSocketMessage } from '../types'

const WS_BASE = import.meta.env.VITE_WS_URL

export function useWebSocket(
  onMessage: (msg: WebSocketMessage) => void,
  token: string | null,
): void {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!token) return

    let retryCount = 0
    let ws: WebSocket
    let timeoutId: ReturnType<typeof setTimeout>
    let unmounted = false

    function connect() {
      ws = new WebSocket(`${WS_BASE}/ws?token=${token}`)

      ws.onmessage = (e) => {
        try {
          onMessageRef.current(JSON.parse(e.data) as WebSocketMessage)
        } catch { /* ignore malformed frames */ }
      }

      ws.onopen = () => { retryCount = 0 }

      ws.onclose = () => {
        if (unmounted) return
        const delay = Math.min(1000 * 2 ** retryCount, 30000)
        retryCount++
        timeoutId = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      unmounted = true
      clearTimeout(timeoutId)
      ws?.close()
    }
  }, [token])
}
