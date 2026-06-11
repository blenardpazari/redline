import type { IpProfile } from '../../types'
import styles from './IpHeader.module.css'

function scoreLevel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'CRITICAL',   color: 'var(--critical)' }
  if (score >= 70) return { label: 'WARNING',    color: 'var(--warning)' }
  if (score >= 40) return { label: 'SUSPICIOUS', color: 'var(--suspicious)' }
  return               { label: 'NORMAL',      color: 'var(--normal)' }
}

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e0 + c.charCodeAt(0) - 65)
  )
}

function maskIp(ip: string): string {
  const p = ip.split('.')
  return p.length === 4 ? `${p[0]}.${p[1]}.x.x` : ip
}

function fmtDate(ts: string): string {
  return new Date(ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

interface Props { profile: IpProfile }

export default function IpHeader({ profile }: Props) {
  const level = scoreLevel(profile.max_score)
  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <span className={styles.ip}>{maskIp(profile.ip)}</span>
        <span className={styles.country}>
          {countryFlag(profile.country)}&nbsp;{profile.country ?? 'Unknown'}
        </span>
        <span className={styles.dates}>
          First&nbsp;{fmtDate(profile.first_seen)}&nbsp;·&nbsp;Last&nbsp;{fmtDate(profile.last_seen)}
        </span>
      </div>
      <div className={styles.badge} style={{ borderColor: level.color, color: level.color }}>
        Max {profile.max_score.toFixed(1)} — {level.label}
      </div>
    </div>
  )
}
