# Redline

Redline is a real-time web traffic threat detection platform I built as part of my master's thesis in Applied Machine Learning. The idea was simple — I wanted to actually understand what was hitting my servers, not just look at nginx access logs and guess.

It monitors HTTP logs from web servers, scores each request using a combination of rule-based detection and machine learning, and visualizes everything in a live dashboard. Alerts fire through Slack, Telegram, Discord, or email when something critical is detected. Server up/down status is tracked and alerted separately.

---

## What it does

- Tails nginx/apache access logs via a lightweight agent installed on each server
- Scores each request in real time using a hybrid rule + ML pipeline
- Streams scored entries to the dashboard over WebSocket
- Shows a live threat map with attack origins and animated arcs toward your datacenter markers
- Groups attacks into clusters using DBSCAN to identify coordinated campaigns
- Lets you inspect individual IPs, view their full request history, and understand why something was flagged
- Tracks server online/offline status and sends alerts when a server goes down or comes back up
- Sends alerts through any combination of Slack, Telegram, Discord, custom webhook, and email
- Supports multiple servers, each with their own API key, source type, and geolocation

---

## How the scoring works

Every incoming log entry goes through three tiers in order:

**1. Rule engine (always runs first)**

A set of regex patterns checked against the request path. If a rule matches, it wins — the ML models are skipped. This was necessary because the ML model trained on mostly normal traffic would frequently score known attacks as normal. The rules cover:

| Threat | Score | Patterns |
|--------|-------|----------|
| CMD Injection | 95 | `&&`, `\|\|`, `$(`, backticks |
| SQL Injection | 92 | `UNION SELECT`, `DROP TABLE`, `sleep()`, `' OR '1'='1'` |
| Path Traversal | 90 | `../`, `etc/passwd`, `/proc/self` |
| XSS | 88 | `<script>`, `onerror=`, `javascript:` |
| DDoS | 85 | ≥ 30 requests/minute from same IP |
| Brute Force | 78 | `/wp-login.php`, `/admin/login`, `/xmlrpc.php` |
| Path Scan | 75 | `.env`, `.git`, `phpinfo`, `shell.php` |

**2. ML models (if no rule matched)**

Two models run together:

- **Anomaly detector** — IsolationForest trained on `[requests_per_minute, response_time_ms, status_code, hour_of_day, is_known_attack_path]`. Outputs a 0–100 anomaly score via MinMaxScaler.
- **Threat classifier** — TF-IDF (character n-grams, 3–5 chars) + LogisticRegression on the request path. Predicts threat type and confidence.

Final score: `anomaly_score × 0.6 + classifier_confidence × 0.4`

**3. Fallback (if models aren't trained yet)**

Simple heuristics based on known paths and HTTP error codes. Gets replaced once you train on real data.

Each entry records which engine scored it (`rules`, `ml`, or `fallback`) — visible in the Log Explorer as an "Engine" badge.

---

## Architecture

```
[Web server logs]
      │
      ▼
[Agent — bash + Python]        tails log files, parses nginx format, POSTs each line
      │
      ▼
POST /ingest/webhook/{api_key}
      │
      ▼
[FastAPI backend]
  ├── GeoIP lookup (ipinfo.io → ip-api.com fallback)
  ├── Threat scoring (rules → ML → fallback)
  ├── SQLite insert
  ├── Alert engine (threshold check → integrations → WebSocket broadcast)
  └── WebSocket broadcast → dashboard
      │
      ▼
[React dashboard]
  ├── Live feed (WebSocket)
  ├── Threat Map (Leaflet + canvas arc animation)
  ├── Log Explorer (search, filters, pagination)
  ├── IP Inspector
  ├── Analytics & clustering
  └── Insights (ML metrics, confusion matrix)
```

---

## Stack

**Backend**
- Python 3.11, FastAPI, uvicorn
- SQLite (WAL mode)
- scikit-learn (IsolationForest, LogisticRegression, TF-IDF)
- python-jose (JWT), bcrypt
- httpx, smtplib

**Frontend**
- React 18, TypeScript, Vite
- Tailwind CSS v4
- Recharts, Leaflet / react-leaflet
- @dnd-kit (drag-and-drop dashboard layout)

**Agent**
- Bash + embedded Python 3
- Runs as a systemd service
- Tails log files matching a configurable glob pattern

---

## Running locally

**Backend**

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in JWT_SECRET, SMTP etc.
uvicorn app.main:app --reload --port 9000
```

**Frontend**

```bash
cd apps/dashboard
npm install
npm run dev
```

The dashboard runs on `http://localhost:5173` and proxies API calls to port 9000.

**First login**

Default credentials are set in `.env` via `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`. Generate a bcrypt hash with:

```bash
python -c "import bcrypt; print(bcrypt.hashpw(b'yourpassword', bcrypt.gensalt()).decode())"
```

---

## Training the ML models

Once you have some real traffic in the database, go to **Insights → Retrain**. This trains both the anomaly detector and the classifier on your collected logs and saves them to `ml/artifacts/`. The dashboard shows precision, recall, and F1 per threat class after training.

Until models are trained, the fallback scorer handles everything. The rule engine always runs regardless.

---

## Adding a server

1. Go to **Sites → Add Site**
2. Choose the server type (CloudPanel, Nginx, Apache, GCE, AWS, Docker)
3. Enter the public IP — it gets geolocated automatically and shows up as a datacenter marker on the Threat Map
4. Copy the generated API key and run the setup command shown in the card

The agent installs itself as a systemd service and starts posting log entries immediately. Server status flips to **online** as soon as the first log entry arrives and to **offline** when no entries are received within the configured window — both state changes trigger an alert.

---

## Database

Currently using SQLite, stored at the path set in `SQLITE_PATH` (.env). SQLite works fine for a single-server deployment and keeps the setup simple while the project is still in active development. The plan is to migrate to PostgreSQL before any multi-tenant or SaaS deployment — the query layer is abstracted enough that the switch shouldn't be painful.

Main tables:

- `log_entries` — every scored request (indexed on timestamp and server_id)
- `alerts` — triggered alerts with acknowledgment state
- `servers` — registered servers with geolocation (city, country, lat, lon)
- `connectors` — integration configs (Slack, Telegram, Discord, Webhook, Email)
- `users` — admin and viewer accounts
- `geo_block_rules` — IP country blocks
- `rate_limit_blocks` — temporary IP bans

Migrations run automatically on startup — no manual schema management needed.

---

## Integrations

Redline routes alerts to multiple channels simultaneously via the **Integrations** page. Each integration is configured separately, can be toggled on/off independently, and has a test button to verify delivery before enabling.

Currently supported:

- **Slack** — webhook URL, formatted message with threat type and score
- **Telegram** — bot token + chat ID, HTML-formatted message
- **Discord** — webhook URL, same message format
- **Custom webhook** — raw JSON POST to any URL, optional secret header
- **Email** — SMTP (works with Gmail app passwords, Mailgun SMTP, etc.)

---

## Planned features

Things I'm working on or plan to add:

**Log sources**
- Google Cloud Logging — pull logs from GCP projects via the Cloud Logging API
- AWS CloudWatch Logs — stream from CloudWatch log groups
- Cloudflare Workers logs — ingest edge request logs
- Datadog log forwarding — receive via Datadog log pipeline
- Syslog receiver — accept logs over UDP/TCP syslog protocol
- Kubernetes — pod log aggregation via a DaemonSet agent

**Detection**
- Custom rule editor — define your own regex patterns and scores from the UI
- Allowlist/blocklist management — permanent IP or CIDR range rules
- Behavioral baselines — detect deviations from a server's own traffic patterns, not just global thresholds
- Credential stuffing detection — identify distributed low-rate login attacks across many IPs

**Alerting & integrations**
- PagerDuty integration — escalation policies for critical alerts
- OpsGenie — on-call routing
- Microsoft Teams webhook
- Alert suppression rules — silence alerts for known IPs or paths
- Scheduled digest emails — daily/weekly summary instead of per-alert noise

**Smart agents and cloud integrations**

Right now the agent is passive — it tails logs and ships them to Redline. The next version will be bidirectional. Redline will be able to send commands back to agents and block threats at the infrastructure level. The approach differs depending on where the server lives.

**Traditional servers (VPS, bare metal, CloudPanel)**

A smarter agent installed as a systemd service, maintaining a persistent connection to Redline so it can receive commands in real time:
- Block an IP via `iptables` or `ufw` directly from the dashboard
- Add an IP to nginx's `deny` list and reload the config
- Temporarily rate-limit a CIDR range at the firewall level
- Restart a web server process (nginx, apache) after a detected crash
- Pull current server metrics (CPU, memory, disk, open connections) on demand
- Auto-block IPs that exceed a configurable score threshold without manual intervention

Each action is logged with the admin who triggered it.

**Google Cloud Platform**

No agent needed. Instead, a service account with the right IAM roles:
- Pull logs from Cloud Logging API instead of tailing files
- Block IPs via Cloud Armor security policies
- Manage firewall rules via the Compute Engine API

**AWS**

- Ingest from CloudWatch Logs via API + IAM role
- Block via Security Groups API or AWS WAF managed rules

**Cloudflare**

- Logs via Cloudflare Logs API (already partially supported via cf_zones)
- Blocking via Firewall Rules API or IP Access Rules

**Kubernetes**

- DaemonSet or sidecar container reading pod logs
- NetworkPolicy or service mesh rules for blocking

The distinction I'm drawing is: **agent** for infrastructure you own and SSH into, **API + service account** for managed cloud platforms where you don't control the underlying OS.

**Infrastructure**
- PostgreSQL — migration path ready for when SQLite stops being enough
- Multi-tenant — separate data per organization, foundation for SaaS
- API rate limiting — per-key ingestion limits to prevent abuse
- Agent auto-update — pull new agent versions without manual SSH

**Dashboard**
- Server uptime history chart — visual timeline of online/offline periods
- Response time heatmap — spot slow endpoints and correlate with attacks
- Export — download log entries and alerts as CSV
- Mobile-responsive layout

---

## Context

This started as a thesis project for my Master's in Applied Machine Learning. The research focus was on hybrid detection systems — specifically whether combining deterministic rule engines with probabilistic ML models outperforms either approach alone. The `scored_by` field in every log entry was added specifically to track this.

The plan is to keep developing it and eventually offer it as a SaaS product for developers and small teams who want real visibility into what's hitting their servers without paying for enterprise security tooling.

---

## License

Private for now.
