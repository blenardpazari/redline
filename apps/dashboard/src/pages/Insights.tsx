import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import styles from './Insights.module.css'

const MODEL_COMPARISON = [
  { name: 'Isolation Forest', accuracy: 94.2 },
  { name: 'LOF', accuracy: 91.5 },
  { name: 'One-Class SVM', accuracy: 88.3 },
]

const CM_LABELS = ['NORM', 'BRUT', 'SQL', 'SCAN', 'PATH', 'BOT']
const CM_DATA = [
  [580,   0,  0,  0,  0,  3],
  [  0,  98,  0,  1,  0,  0],
  [  0,   0, 79,  0,  0,  0],
  [  0,   1,  0, 97,  0,  2],
  [  0,   0,  2,  0, 67,  0],
  [  4,   0,  0,  2,  0, 43],
]

const CM_MAX = Math.max(...CM_DATA.flat())

const TICK = { fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }
const TOOLTIP_STYLE = { background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 0, fontSize: 12 }

function ConfusionMatrix() {
  return (
    <div className={styles.matrix}>
      <div className={styles.matrixGrid}>
        <div />
        {CM_LABELS.map((l) => <div key={l} className={styles.matrixLabel}>{l}</div>)}
        {CM_DATA.map((row, i) => (
          [
            <div key={`l${i}`} className={styles.matrixLabel}>{CM_LABELS[i]}</div>,
            ...row.map((val, j) => (
              <div
                key={`${i}${j}`}
                className={styles.matrixCell}
                style={{
                  background: i === j
                    ? `rgba(34,197,94,${val / CM_MAX})`
                    : `rgba(239,68,68,${(val / CM_MAX) * 3})`,
                }}
              >
                {val}
              </div>
            )),
          ]
        ))}
      </div>
    </div>
  )
}

export default function Insights() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <span className={styles.navTitle}>Redline</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/" className={styles.navLink}>Dashboard</Link>
          <Link to="/map" className={styles.navLink}>Map</Link>
        </div>
      </nav>
      <div className={styles.content}>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statValue}>94.2%</div>
            <div className={styles.statLabel}>Anomaly Detector</div>
            <div className={styles.statSub}>Isolation Forest · 5-fold CV</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>97.1%</div>
            <div className={styles.statLabel}>Threat Classifier</div>
            <div className={styles.statSub}>TF-IDF + LogReg · 5-fold CV</div>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Anomaly Model Comparison</div>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MODEL_COMPARISON} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[80, 100]} tick={TICK} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="accuracy" fill="#22c55e" radius={0} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Classifier Confusion Matrix</div>
            <ConfusionMatrix />
          </div>
        </div>
      </div>
    </div>
  )
}
