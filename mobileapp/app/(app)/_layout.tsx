import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { getStoredUserRole } from "../../src/storage/authStorage";
import { colors } from "../../src/theme/colors";
import type { UserRole } from "../../src/types/api";

export default function AppTabsLayout() {
  return (
    <SafeAreaProvider>
      <AppTabs />
    </SafeAreaProvider>
  );
}

function AppTabs() {
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadRole() {
        const storedRole = await getStoredUserRole();

        if (!isMounted) {
          return;
        }

        setRole(storedRole);
        setRoleLoaded(true);
      }

      loadRole();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const isAdmin = roleLoaded && role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          backgroundColor: colors.white,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="commands"
        options={{
          title: "Commands",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="shield-checkmark-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
