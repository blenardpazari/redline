import { useState } from 'react'

export type WidgetId =
  | 'stats'
  | 'live_feed'
  | 'alerts'
  | 'chart'
  | 'attackers'
  | 'sites'
  | 'map'

export const WIDGET_LABELS: Record<WidgetId, string> = {
  stats:     'Stats',
  live_feed: 'Live Feed',
  alerts:    'Alerts',
  chart:     'Threat Chart',
  attackers: 'Top Attackers',
  sites:     'Sites',
  map:       'Mini Map',
}

// full = spans both columns, half = one column
export const WIDGET_SPAN: Record<WidgetId, 'full' | 'half'> = {
  stats:     'full',
  live_feed: 'half',
  alerts:    'half',
  chart:     'full',
  attackers: 'half',
  sites:     'half',
  map:       'full',
}

const DEFAULT_ORDER: WidgetId[] = [
  'stats',
  'live_feed',
  'alerts',
  'chart',
  'attackers',
  'sites',
  'map',
]

const STORAGE_KEY = 'redline_dashboard_layout'

function load(): WidgetId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ORDER
    const parsed: WidgetId[] = JSON.parse(raw)
    const valid = parsed.filter(id => DEFAULT_ORDER.includes(id))
    const missing = DEFAULT_ORDER.filter(id => !valid.includes(id))
    return [...valid, ...missing]
  } catch {
    return DEFAULT_ORDER
  }
}

function save(order: WidgetId[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
}

export function useDashboardLayout() {
  const [order, setOrder] = useState<WidgetId[]>(load)

  function reorder(newOrder: WidgetId[]) {
    setOrder(newOrder)
    save(newOrder)
  }

  function reset() {
    setOrder(DEFAULT_ORDER)
    save(DEFAULT_ORDER)
  }

  return { order, reorder, reset }
}
