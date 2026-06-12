export type ThreatLevel = "normal" | "suspicious" | "warning" | "critical";

export interface LogEntry {
  id: number;
  timestamp: string;
  ip: string;
  country: string | null;
  lat: number | null;
  lon: number | null;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  threat_level: ThreatLevel;
  threat_score: number;
  threat_type: string | null;
  scored_by: 'rules' | 'ml' | 'fallback';
}

export interface Alert {
  id: number;
  created_at: string;
  ip: string;
  country: string | null;
  threat_type: string;
  score: number;
  path: string;
  email_sent: boolean;
}

export interface ThreatScore {
  anomaly_score: number;
  classifier_confidence: number;
  threat_type: string;
  final_score: number;
  threat_level: ThreatLevel;
}

export interface Stats {
  requests_today: number;
  anomalies_today: number;
  redlines_today: number;
}

export interface ChartDataPoint {
  time: string;
  normal: number;
  anomaly: number;
}

export interface AuthToken {
  token: string;
  expires_at: string;
}

export type WebSocketMessage =
  | { type: "log_entry"; data: LogEntry }
  | { type: "alert"; data: Alert };

export interface LogSearchResponse {
  entries: LogEntry[]
  total: number
  page: number
  limit: number
}

export interface IpProfile {
  ip: string
  country: string | null
  total_requests: number
  first_seen: string
  last_seen: string
  avg_score: number
  max_score: number
  threat_types: string[]
  requests: LogEntry[]
}

export interface AnalyticsPoint {
  label: string
  normal: number
  anomaly: number
  critical: number
}

export interface AnalyticsResponse {
  labels: string[]
  normal: number[]
  anomaly: number[]
  critical: number[]
  peak_per_minute: number
}

export interface AlertSettings {
  critical_threshold: number
  warning_threshold: number
  cooldown_minutes: number
  email_enabled: boolean
  email_recipient: string
}

export interface BreakdownItem {
  threat_type: string
  count: number
  percent: number
}

export interface ThreatBreakdownResponse {
  requests_today: number
  anomalies_today: number
  redlines_today: number
  breakdown: BreakdownItem[] | null
  top_path: string | null
  top_ip: string | null
  busiest_hour: number | null
}

export type ServerStatus = 'online' | 'offline' | 'unconfigured'
export type ServerEnv = 'production' | 'staging' | 'dev'
export type ServerSourceType = 'cloudpanel'

export interface Server {
  id: number
  name: string
  env: ServerEnv
  source_type: ServerSourceType
  api_key: string
  status: ServerStatus
  last_seen: string | null
  created_at: string
  total_events: number
  last_event: string | null
  setup?: { title: string; steps: string[] }
}

export interface ServerStats {
  requests_today: number
  anomalies_today: number
  redlines_today: number
}

export interface Site {
  id: number
  server_id: number
  name: string
  zone_id: string
  zone_name: string
  last_poll: string | null
  total_pulled: number
  enabled: boolean
  created_at: string
}

export type UserRole = 'admin' | 'viewer'

export interface User {
  id: number
  username: string
  role: UserRole
  created_at: string
  last_login: string | null
}


export interface AlertFull extends Alert {
  server_id: number | null
  acked_at: string | null
  acked_by: string | null
  ack_note: string | null
}

export interface AlertsFullResponse {
  alerts: AlertFull[]
  total: number
  page: number
  limit: number
}

export interface CfZone {
  id: number
  server_id: number
  server_name: string | null
  zone_id: string
  zone_name: string
  api_token: string
  last_poll: string | null
  total_pulled: number
  enabled: boolean
  created_at: string
}

export interface HealthResponse {
  status: string
  uptime_seconds: number
  db_size_bytes: number
  db_log_count: number
  db_alert_count: number
  ml_model_version: string
  servers_total: number
  servers_online: number
  api_version: string
}
