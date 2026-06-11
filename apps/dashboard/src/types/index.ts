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

export type ConnectorStatus = 'active' | 'inactive' | 'unconfigured'

export interface Connector {
  id: string
  name: string
  source_type: string
  description: string
  status: ConnectorStatus
  total_events: number
  last_event: string | null
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
