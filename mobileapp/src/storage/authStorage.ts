import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "serversensei_access_token";

function isWeb(): boolean {
  return Platform.OS === "web";
}

export async function saveToken(token: string): Promise<void> {
  if (isWeb()) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (isWeb()) {
    return localStorage.getItem(TOKEN_KEY);
  }

  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (isWeb()) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}