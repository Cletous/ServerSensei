import axios from "axios";

import { API_BASE_URL } from "../config/api";
import { getToken } from "../storage/authStorage";
import type {
  CommandCreateRequest,
  CommandResponse,
  DecisionEvaluation,
  Device,
  LoginResponse,
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

export async function getDecisionEvaluation(
  deviceId: string
): Promise<DecisionEvaluation> {
  const response = await apiClient.get<DecisionEvaluation>(
    `/devices/${deviceId}/decision/evaluation`
  );

  return response.data;
}

export async function createCommand(
  command: CommandCreateRequest
): Promise<CommandResponse> {
  const response = await apiClient.post<CommandResponse>("/commands", command);
  return response.data;
}