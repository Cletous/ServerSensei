export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type Device = {
  id: number;
  device_id: string;
  device_name: string;
  location: string | null;
  mode: string;
  online: boolean;
};

export type RecentAlert = {
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
};

export type DecisionEvaluation = {
  device_id: string;
  device_name: string;
  mode: string;
  online: boolean;

  temperature: number | null;
  humidity: number | null;
  air_quality_raw: number | null;
  air_quality_status: string | null;

  power_source: string | null;
  battery_percent: number | null;
  load_percent: number | null;
  estimated_runtime_minutes: number | null;

  environmental_risk: string | null;
  system_recommendation: string | null;

  alert_count_recent: number;
  highest_recent_severity: string | null;
  recent_alerts: RecentAlert[];

  evaluation_summary: string;
  latest_telemetry_at: string | null;
  power_updated_at: string | null;
};

export type CommandResponse = {
  id: number;
  device_id: string;
  action: string;
  payload: Record<string, unknown> | null;
  status: string;
  created_at: string;
  executed_at: string | null;
};

export type CommandCreateRequest = {
  device_id: string;
  action: string;
  payload?: Record<string, unknown>;
};