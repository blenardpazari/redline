import type { CSSProperties } from 'react'
import type { ThreatLevel } from '../types'

/** Concrete colors for SVG charts (Recharts can't resolve CSS variables in attributes). */
export interface ChartTheme {
  grid: string
  tick: { fill: string; fontSize: number; fontFamily: string }
  tooltip: CSSProperties
  tooltipLabel: CSSProperties
  axisLabel: string
  ok: string
  sus: string
  warn: string
  crit: string
  neutral: string
  purple: string
  blue: string
}

const MONO = "'JetBrains Mono', ui-monospace, monospace"

export function chartTheme(dark: boolean): ChartTheme {
  return {
    grid: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.07)',
    tick: { fill: dark ? '#9aa4b2' : '#687586', fontSize: 11, fontFamily: MONO },
    tooltip: {
      background: dark ? '#1c2026' : '#ffffff',
      border: `1px solid ${dark ? '#2c323b' : '#e4e7ec'}`,
      borderRadius: 8,
      fontSize: 12,
      boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
      color: dark ? '#e8ebef' : '#2a2f36',
    },
    tooltipLabel: { color: dark ? '#9aa4b2' : '#687586' },
    axisLabel: dark ? '#9aa4b2' : '#687586',
    ok: dark ? '#4ade80' : '#16a34a',
    sus: dark ? '#facc15' : '#ca8a04',
    warn: dark ? '#fb923c' : '#ea580c',
    crit: dark ? '#f87171' : '#dc2626',
    neutral: dark ? '#636e7b' : '#98a2b3',
    purple: dark ? '#a78bfa' : '#7c3aed',
    blue: dark ? '#60a5fa' : '#2563eb',
  }
}

export function threatTypeColor(t: ChartTheme, type: string): string {
  switch (type) {
    case 'NORMAL': return t.ok
    case 'BRUTE_FORCE': return t.crit
    case 'SQL_INJECTION': return t.warn
    case 'SCANNER': return t.sus
    case 'PATH_TRAVERSAL': return t.purple
    case 'BOT': return t.blue
    default: return t.neutral
  }
}

export function levelColor(t: ChartTheme, level: ThreatLevel): string {
  switch (level) {
    case 'critical': return t.crit
    case 'warning': return t.warn
    case 'suspicious': return t.sus
    default: return t.ok
  }
}

export const LEVEL_TEXT_CLASS: Record<ThreatLevel, string> = {
  normal: 'text-ok',
  suspicious: 'text-sus',
  warning: 'text-warn',
  critical: 'text-crit',
}

export const LEVEL_DOT_VAR: Record<ThreatLevel, string> = {
  normal: 'var(--ok)',
  suspicious: 'var(--sus)',
  warning: 'var(--warn)',
  critical: 'var(--crit)',
}

export const LEVEL_ROW_CLASS: Record<ThreatLevel, string> = {
  critical: 'bg-crit/8',
  warning: 'bg-warn/6',
  suspicious: 'bg-sus/5',
  normal: '',
}

export function scoreTextClass(score: number): string {
  if (score >= 85) return 'text-crit'
  if (score >= 70) return 'text-warn'
  return 'text-sus'
}
