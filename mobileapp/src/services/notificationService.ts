import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { AlertItem } from "../types/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupLocalNotifications(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const existingPermissions = await Notifications.getPermissionsAsync();

  let finalStatus = existingPermissions.status;

  if (existingPermissions.status !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted.");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("serversensei-alerts", {
      name: "ServerSensei Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#16A34A",
      sound: "default",
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export function isNotifiableAlert(alert: AlertItem): boolean {
  return ["warning", "critical"].includes(alert.severity.toLowerCase());
}

export async function showAlertNotification(alert: AlertItem): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  if (!isNotifiableAlert(alert)) {
    return;
  }

  const title =
    alert.severity.toLowerCase() === "critical"
      ? "ServerSensei Critical Alert"
      : "ServerSensei Warning Alert";

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: alert.message,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        alert_id: alert.id,
        device_id: alert.device_id,
        alert_type: alert.alert_type,
        severity: alert.severity,
      },
    },
    trigger: null,
  });
}