import { useNavigate } from 'react-router-dom'
import type { LogEntry, ThreatLevel } from '../../types'
import styles from './LogRow.module.css'

const LEVEL_COLOR: Record<ThreatLevel, string> = {
  normal:     'var(--normal)',
  suspicious: 'var(--suspicious)',
  warning:    'var(--warning)',
  critical:   'var(--critical)',
}

const CONTINENT: Record<string, string> = {
  AF:'AF',DZ:'AF',AO:'AF',BJ:'AF',BW:'AF',BF:'AF',BI:'AF',CM:'AF',CV:'AF',CF:'AF',TD:'AF',KM:'AF',CG:'AF',CD:'AF',DJ:'AF',EG:'AF',GQ:'AF',ER:'AF',ET:'AF',GA:'AF',GM:'AF',GH:'AF',GN:'AF',GW:'AF',CI:'AF',KE:'AF',LS:'AF',LR:'AF',LY:'AF',MG:'AF',MW:'AF',ML:'AF',MR:'AF',MU:'AF',MA:'AF',MZ:'AF',NA:'AF',NE:'AF',NG:'AF',RW:'AF',ST:'AF',SN:'AF',SC:'AF',SL:'AF',SO:'AF',ZA:'AF',SS:'AF',SD:'AF',SZ:'AF',TZ:'AF',TG:'AF',TN:'AF',UG:'AF',ZM:'AF',ZW:'AF',
  US:'NA',CA:'NA',MX:'NA',GT:'NA',BZ:'NA',HN:'NA',SV:'NA',NI:'NA',CR:'NA',PA:'NA',CU:'NA',JM:'NA',HT:'NA',DO:'NA',PR:'NA',TT:'NA',BB:'NA',LC:'NA',VC:'NA',GD:'NA',AG:'NA',DM:'NA',KN:'NA',
  BR:'SA',AR:'SA',CL:'SA',CO:'SA',VE:'SA',PE:'SA',EC:'SA',BO:'SA',PY:'SA',UY:'SA',GY:'SA',SR:'SA',
  GB:'EU',DE:'EU',FR:'EU',IT:'EU',ES:'EU',PT:'EU',NL:'EU',BE:'EU',CH:'EU',AT:'EU',SE:'EU',NO:'EU',DK:'EU',FI:'EU',PL:'EU',CZ:'EU',SK:'EU',HU:'EU',RO:'EU',BG:'EU',HR:'EU',RS:'EU',SI:'EU',BA:'EU',ME:'EU',MK:'EU',AL:'EU',GR:'EU',TR:'EU',RU:'EU',UA:'EU',BY:'EU',MD:'EU',LT:'EU',LV:'EU',EE:'EU',IS:'EU',IE:'EU',LU:'EU',MT:'EU',CY:'EU',
  CN:'AS',JP:'AS',KR:'AS',IN:'AS',ID:'AS',PK:'AS',BD:'AS',VN:'AS',TH:'AS',MY:'AS',PH:'AS',SG:'AS',MM:'AS',KH:'AS',LA:'AS',MN:'AS',KZ:'AS',UZ:'AS',TM:'AS',TJ:'AS',KG:'AS',AF:'AS',IR:'AS',IQ:'AS',SA:'AS',AE:'AS',QA:'AS',KW:'AS',BH:'AS',OM:'AS',YE:'AS',JO:'AS',LB:'AS',SY:'AS',IL:'AS',HK:'AS',TW:'AS',
  AU:'OC',NZ:'OC',PG:'OC',FJ:'OC',SB:'OC',VU:'OC',WS:'OC',KI:'OC',TO:'OC',
}

function countryFlag(code: string): string {
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)))
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface Props {
  entry: LogEntry
}

export default function LogRow({ entry }: Props) {
  const navigate = useNavigate()
  const color = LEVEL_COLOR[entry.threat_level]
  return (
    <div className={styles.row}>
      <span className={styles.dot} style={{ background: color }} />
      <span className={styles.time}>{formatTime(entry.timestamp)}</span>
      <span className={styles.country}>
        {entry.country
          ? <>{countryFlag(entry.country)} {entry.country} <span className={styles.continent}>{CONTINENT[entry.country] ?? ''}</span></>
          : '--'}
      </span>
      <span
        className={`${styles.ip} ${styles.ipLink}`}
        onClick={() => navigate(`/ip/${entry.ip}`)}
      >
        {entry.ip}
      </span>
      <span className={styles.method}>{entry.method}</span>
      <span className={styles.path}>{entry.path}</span>
      <span className={styles.status}>{entry.status_code}</span>
      <span className={styles.score} style={{ color }}>{entry.threat_score.toFixed(1)}</span>
    </div>
  )
}
