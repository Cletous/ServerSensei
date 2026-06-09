import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setupLocalNotifications } from "../src/services/notificationService";

export default function RootLayout() {
  useEffect(() => {
    setupLocalNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack initialRouteName="login">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
