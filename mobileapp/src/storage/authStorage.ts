import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { AuthUser, UserRole } from "../types/api";

const TOKEN_KEY = "serversensei_auth_token";
const USER_KEY = "serversensei_auth_user";

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await clearSession();
}

export async function saveSession(token: string, user: AuthUser): Promise<void> {
  await setItem(TOKEN_KEY, token);
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const rawUser = await getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    await deleteItem(USER_KEY);
    return null;
  }
}

export async function getStoredUserRole(): Promise<UserRole | null> {
  const user = await getStoredUser();
  return user?.role ?? null;
}

export async function clearSession(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_KEY);
}