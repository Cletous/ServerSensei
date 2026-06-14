import axios from "axios";

import { API_BASE_URL } from "../config/api";
import { getToken } from "../storage/authStorage";
import type {
  AlertItem,
  AuditLogResponse,
  CommandCreateRequest,
  CommandResponse,
  DecisionEvaluation,
  Device,
  LoginResponse,
  PushTokenRegisterRequest,
  PushTokenResponse,
  RuntimeSettings,
  RuntimeSettingsUpdateRequest,
  TelemetryHistoryPoint,
  UserCreateRequest,
  UserItem,
  UserRoleUpdateRequest,
  UserStatusUpdateRequest,
} from "../types/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function getDevices(): Promise<Device[]> {
  const response = await apiClient.get<Device[]>("/devices");
  return response.data;
}

export async function getAuditLogs(limit = 50): Promise<AuditLogResponse[]> {
  const response = await apiClient.get<AuditLogResponse[]>(
    `/admin/audit-logs?limit=${limit}`,
  );

  return response.data;
}

export async function getDecisionEvaluation(
  deviceId: string
): Promise<DecisionEvaluation> {
  const response = await apiClient.get<DecisionEvaluation>(
    `/devices/${deviceId}/decision/evaluation`
  );

  return normalizeOfflineEvaluation(response.data);
}

function normalizeOfflineEvaluation(
  evaluation: DecisionEvaluation
): DecisionEvaluation {
  if (evaluation.online !== false) {
    return evaluation;
  }

  return {
    ...evaluation,
    power_source: "offline",
    battery_percent: 0,
    load_percent: 0,
    estimated_runtime_minutes: 0,
    fan_on: false,
    cooling_reason: "System fully shut down; cooling fan is off.",
    critical_server_a_on: false,
    critical_server_b_on: false,
    non_critical_server_a_on: false,
    non_critical_server_b_on: false,
    evaluation_summary:
      "Device is offline after full shutdown. UPS battery is depleted, runtime is 0 minutes, and all simulated server loads are off.",
  };
}

export async function createCommand(
  command: CommandCreateRequest
): Promise<CommandResponse> {
  const response = await apiClient.post<CommandResponse>("/commands", command);
  return response.data;
}

export async function getCommandsAwaitingApproval(): Promise<CommandResponse[]> {
  const response = await apiClient.get<CommandResponse[]>(
    "/admin/commands/approvals",
  );

  return response.data;
}

export async function approveCommand(commandId: number): Promise<CommandResponse> {
  const response = await apiClient.post<CommandResponse>(
    `/admin/commands/${commandId}/approve`,
    {},
  );

  return response.data;
}

export async function rejectCommand(commandId: number): Promise<CommandResponse> {
  const response = await apiClient.post<CommandResponse>(
    `/admin/commands/${commandId}/reject`,
    {},
  );

  return response.data;
}

export async function getRuntimeSettings(
  deviceId: string
): Promise<RuntimeSettings> {
  const response = await apiClient.get<RuntimeSettings>(
    `/devices/${deviceId}/settings/runtime`
  );

  return response.data;
}

export async function updateRuntimeSettings(
  deviceId: string,
  settings: RuntimeSettingsUpdateRequest
): Promise<RuntimeSettings> {
  const response = await apiClient.put<RuntimeSettings>(
    `/devices/${deviceId}/settings`,
    settings
  );

  return response.data;
}

export async function getDeviceAlerts(deviceId: string): Promise<AlertItem[]> {
  const response = await apiClient.get<AlertItem[]>(
    `/devices/${deviceId}/alerts`
  );

  return response.data;
}

export async function getTelemetryHistory(
  deviceId: string,
  limit = 30
): Promise<TelemetryHistoryPoint[]> {
  const response = await apiClient.get<TelemetryHistoryPoint[]>(
    `/devices/${deviceId}/telemetry/history`,
    {
      params: {
        limit,
      },
    }
  );

  return response.data;
}

export async function sendRemoteTestPush(): Promise<{
  message: string;
  sent_count: number;
}> {
  const response = await apiClient.post<{
    message: string;
    sent_count: number;
  }>("/push-tokens/test", {});

  return response.data;
}

export async function registerPushToken(
  request: PushTokenRegisterRequest
): Promise<PushTokenResponse> {
  const response = await apiClient.post<PushTokenResponse>(
    "/push-tokens",
    request
  );

  return response.data;
}

export async function getAdminUsers(): Promise<UserItem[]> {
  const response = await apiClient.get<UserItem[]>("/admin/users");
  return response.data;
}

export async function updateAdminUserRole(
  userId: number,
  request: UserRoleUpdateRequest
): Promise<UserItem> {
  const response = await apiClient.patch<UserItem>(
    `/admin/users/${userId}/role`,
    request
  );

  return response.data;
}

export async function updateAdminUserStatus(
  userId: number,
  request: UserStatusUpdateRequest
): Promise<UserItem> {
  const response = await apiClient.patch<UserItem>(
    `/admin/users/${userId}/status`,
    request
  );

  return response.data;
}