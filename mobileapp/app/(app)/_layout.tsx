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

  const isViewer = roleLoaded && role === "viewer";
  const isAdmin = roleLoaded && role === "admin";

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          height: 66 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="monitor"
        options={{
          title: "Monitor",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="commands"
        options={{
          title: "Operations",
          href: isViewer ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size} color={color} />
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
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="environment"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="power"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="trends"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="digital-twin"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? null : null,
        }}
      />
    </Tabs>
  );
}
