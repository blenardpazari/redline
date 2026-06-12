import Layout from '../components/Layout/Layout'

const STACK = [
  { name: 'FastAPI', desc: 'REST API & WebSocket', color: '#009688' },
  { name: 'scikit-learn', desc: 'ML Models', color: '#f89939' },
  { name: 'React', desc: 'Dashboard UI', color: '#61dafb' },
  { name: 'SQLite', desc: 'Database', color: '#003b57' },
  { name: 'Isolation Forest', desc: 'Anomaly Detection', color: '#e53935' },
  { name: 'TF-IDF + LR', desc: 'Threat Classification', color: '#8e24aa' },
]

const FEATURES = [
  { icon: '🛡️', title: 'Real-time Detection', desc: 'Logs are analyzed instantly as they arrive from nginx agents deployed on monitored servers.' },
  { icon: '🤖', title: 'Hybrid ML Engine', desc: 'Combines rule-based pattern matching with Isolation Forest anomaly detection and TF-IDF + Logistic Regression classification.' },
  { icon: '🗺️', title: 'Threat Map', desc: 'Live geographic visualization of attack origins with animated arc overlays showing attack trajectories.' },
  { icon: '⚡', title: 'Attack Simulator', desc: 'Built-in simulator for DDoS, brute force, SQL injection, XSS, and path scanning — for testing and demonstration.' },
]

export default function About() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-10 py-4">

        {/* Hero */}
        <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-white shadow-lg shadow-accent/30">
            RL
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Redline</h1>
          <p className="text-muted text-sm max-w-lg mx-auto leading-relaxed">
            A self-hosted, real-time web security monitoring platform powered by machine learning —
            built to detect, classify, and visualize web threats as they happen.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
            {import.meta.env.VITE_APP_VERSION ?? 'dev'} · Master Thesis Project
          </div>
          <p className="text-xs text-muted max-w-lg mx-auto leading-relaxed border border-border rounded-lg px-4 py-3 bg-surface-2">
            💡 Redline runs on <span className="text-fg font-medium">real production data</span> ingested live from web servers.
            Attack scenarios are demonstrated using the built-in <span className="text-fg font-medium">Attack Simulator</span>, which generates realistic traffic patterns for DDoS, brute force, SQL injection, XSS, and path scanning — allowing threat detection to be observed and evaluated in a controlled way.
          </p>
        </div>

        {/* Academic context */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-dim">Academic Context</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-widest text-dim">University</div>
              <a
                href="https://www.umb.edu.al/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-fg hover:text-accent transition-colors underline underline-offset-2"
              >
                Universiteti Barleti
              </a>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-widest text-dim">Course</div>
              <div className="text-sm font-medium">Machine Learning e Aplikuar</div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-widest text-dim">Supervisor</div>
              <div className="text-sm font-medium text-fg">Msc. Kleona Elezaj</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-dim">How It Works</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl border border-border bg-surface p-5 space-y-2">
                <div className="text-2xl">{f.icon}</div>
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-muted leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ML Architecture */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-dim">ML Architecture</h2>
          <div className="space-y-3 text-sm text-muted leading-relaxed">
            <p>
              Redline uses a <span className="text-fg font-medium">two-model ensemble</span> for threat detection:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-1">
                <div className="text-xs font-semibold text-fg uppercase tracking-wide">Anomaly Detector</div>
                <div className="text-xs text-muted">Isolation Forest trained on behavioral features: requests/min, response time, status codes, and time-of-day patterns.</div>
                <div className="text-xs text-accent font-medium mt-1">60% weight</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-1">
                <div className="text-xs font-semibold text-fg uppercase tracking-wide">Threat Classifier</div>
                <div className="text-xs text-muted">TF-IDF vectorizer on URL paths combined with Logistic Regression to classify attack types.</div>
                <div className="text-xs text-accent font-medium mt-1">40% weight</div>
              </div>
            </div>
            <p>
              Rule-based detection always takes precedence for known attack signatures (SQL injection, XSS, path traversal, brute force).
              ML scores are used when no rule matches.
            </p>
          </div>
        </div>

        {/* Tech stack */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-dim">Tech Stack</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STACK.map(s => (
              <div key={s.name} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-dim">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Author */}
        <div className="rounded-xl border border-border bg-surface p-6 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px] uppercase tracking-widest text-dim">Developed by</div>
            <a href="https://github.com/blenardpazari" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:text-accent transition-colors underline underline-offset-2">Blenard Pazari</a>
            <div className="text-xs text-muted">Master Student · Universiteti Barleti · 2026</div>
          </div>
          <a
            href="https://github.com/blenardpazari/redline"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-fg hover:border-accent transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            View on GitHub
          </a>
        </div>

      </div>
    </Layout>
  )
}
