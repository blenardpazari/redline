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
