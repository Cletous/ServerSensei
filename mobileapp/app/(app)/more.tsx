import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { clearToken, getStoredUserRole } from "../../src/storage/authStorage";
import { colors } from "../../src/theme/colors";
import { useEffect, useState } from "react";
import { showConfirm } from "../../src/utils/dialogs";
import type { UserRole } from "../../src/types/api";

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    getStoredUserRole().then(setRole);
  }, []);

  async function handleLogout() {
    showConfirm({
      title: "Log out?",
      message: "You will need to sign in again to access ServerSensei.",
      confirmText: "Log out",
      cancelText: "Cancel",
      destructive: true,
      onConfirm: async () => {
        await clearToken();
        router.replace("/login");
      },
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ServerSensei</Text>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>
          Settings, administration, audit activity, and account actions.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>

        {role !== "viewer" ? (
          <MenuRow
            icon="settings-outline"
            title="Runtime Settings"
            subtitle="Cooling thresholds, UPS simulation, and backend URL configuration."
            onPress={() => router.push("/settings")}
          />
        ) : null}

        <MenuRow
          icon="notifications-outline"
          title="Alerts"
          subtitle="View alert history and recent incidents."
          onPress={() => router.push("/alerts")}
        />

        {role === "admin" ? (
          <MenuRow
            icon="shield-checkmark-outline"
            title="Admin Console"
            subtitle="User management, approvals, and audit logs."
            onPress={() => router.push("/admin")}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <MenuRow
          icon="log-out-outline"
          title="Log out"
          subtitle="End this mobile app session."
          danger
          onPress={handleLogout}
        />
      </View>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  danger = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons
          name={icon}
          size={22}
          color={danger ? colors.critical : colors.primaryDark}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={20}
        color={colors.mutedText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 18,
  },

  header: {
    marginBottom: 18,
  },

  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },

  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },

  section: {
    marginTop: 14,
  },

  sectionTitle: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  row: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },

  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  rowIconDanger: {
    backgroundColor: "#FEF2F2",
  },

  rowText: {
    flex: 1,
  },

  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },

  rowTitleDanger: {
    color: colors.critical,
  },

  rowSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3,
  },
});
