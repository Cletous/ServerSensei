export type UserRole = "admin" | "operator" | "viewer";

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
  role: UserRole;
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

export type RuntimeSettings = {
  device_id: string;

  fan_on_temperature: number;
  fan_off_temperature: number;

  low_runtime_threshold_minutes: number;
  critical_runtime_threshold_minutes: number;

  demo_ups_full_drain_seconds_at_100_load: number;
  demo_battery_recovery_percent_per_second: number;
  demo_restart_battery_percent: number;

  settings_version: number;
  updated_at: string;
};

export type RuntimeSettingsUpdateRequest = {
  fan_on_temperature?: number;
  fan_off_temperature?: number;

  low_runtime_threshold_minutes?: number;
  critical_runtime_threshold_minutes?: number;

  demo_ups_full_drain_seconds_at_100_load?: number;
  demo_battery_recovery_percent_per_second?: number;
  demo_restart_battery_percent?: number;
};

export type AlertItem = {
  id: number;
  device_id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
};

export type TelemetryHistoryPoint = {
  created_at: string;

  temperature: number | null;
  humidity: number | null;

  air_quality_raw: number | null;
  air_quality_status: string | null;

  power_source: string | null;
  battery_percent: number | null;
  load_percent: number | null;

  environmental_risk: string | null;
  system_recommendation: string | null;
};

export type PushTokenRegisterRequest = {
  token: string;
  platform?: string | null;
};

export type PushTokenResponse = {
  id: number;
  token: string;
  platform: string | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type UserItem = {
  id: number;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type UserRoleUpdateRequest = {
  role: UserRole;
};

export type UserStatusUpdateRequest = {
  active: boolean;
};