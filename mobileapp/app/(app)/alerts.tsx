import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  isNotifiableAlert,
  showAlertNotification,
} from "../../src/services/notificationService";
import { getDeviceAlerts } from "../../src/api/client";
import type { AlertItem } from "../../src/types/api";
import { formatDateTime } from "../../src/utils/dateTime";
import { colors } from "../../src/theme/colors";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstLoadRef = useRef(true);
  const notifiedAlertIdsRef = useRef<Set<number>>(new Set());

  async function loadAlerts() {
    try {
      const data = await getDeviceAlerts(DEFAULT_DEVICE_ID);
      setAlerts(data);

      if (firstLoadRef.current) {
        data.forEach((item) => {
          notifiedAlertIdsRef.current.add(item.id);
        });

        firstLoadRef.current = false;
        return;
      }

      const newNotifiableAlerts = data.filter((item) => {
        return (
          isNotifiableAlert(item) && !notifiedAlertIdsRef.current.has(item.id)
        );
      });

      for (const item of newNotifiableAlerts) {
        await showAlertNotification(item);
        notifiedAlertIdsRef.current.add(item.id);
      }

      if (notifiedAlertIdsRef.current.size > 100) {
        const trimmedIds = Array.from(notifiedAlertIdsRef.current).slice(-100);
        notifiedAlertIdsRef.current = new Set(trimmedIds);
      }
    } catch (error) {
      Alert.alert(
        "Alerts error",
        "Could not load alerts. Check backend, login token, and network.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAlerts();
  }

  useEffect(() => {
    loadAlerts();

    const intervalId = setInterval(() => {
      loadAlerts();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  async function sendTestNotification() {
    await showAlertNotification({
      id: Date.now(),
      device_id: DEFAULT_DEVICE_ID,
      alert_type: "TEST_NOTIFICATION",
      severity: "critical",
      message:
        "This is a ServerSensei test notification. Local alerts are working.",
      created_at: new Date().toISOString(),
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 90,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="notifications-outline"
            size={24}
            color={colors.primary}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>
            Latest environmental, power, runtime, and decision alerts.
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryNumber}>{alerts.length}</Text>
          <Text style={styles.summaryLabel}>recent alerts</Text>
        </View>

        <View style={styles.summaryIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={30}
            color={colors.white}
          />
        </View>
      </View>

      <Pressable style={styles.testButton} onPress={sendTestNotification}>
        <Ionicons name="paper-plane-outline" size={18} color={colors.white} />
        <Text style={styles.testButtonText}>Send Test Notification</Text>
      </Pressable>

      {alerts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Alerts</Text>
          <Text style={styles.muted}>
            No alerts have been recorded for this device yet.
          </Text>
        </View>
      ) : (
        alerts.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.alertHeader}>
              <View style={styles.alertTitleWrap}>
                <SeverityIcon severity={item.severity} />

                <Text style={styles.cardTitle}>{item.alert_type}</Text>
              </View>

              <SeverityPill severity={item.severity} />
            </View>

            <Text style={styles.message}>{item.message}</Text>

            <View style={styles.dateRow}>
              <Ionicons
                name="time-outline"
                size={15}
                color={colors.mutedText}
              />
              <Text style={styles.dateText}>
                {formatDateTime(item.created_at)}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  const normalizedSeverity = severity.toLowerCase();

  if (normalizedSeverity === "critical") {
    return (
      <View style={[styles.severityIcon, styles.severityIconCritical]}>
        <Ionicons
          name="alert-circle-outline"
          size={18}
          color={colors.critical}
        />
      </View>
    );
  }

  if (normalizedSeverity === "warning") {
    return (
      <View style={[styles.severityIcon, styles.severityIconWarning]}>
        <Ionicons name="warning-outline" size={18} color={colors.warning} />
      </View>
    );
  }

  return (
    <View style={[styles.severityIcon, styles.severityIconInfo]}>
      <Ionicons
        name="information-circle-outline"
        size={18}
        color={colors.info}
      />
    </View>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const normalizedSeverity = severity.toLowerCase();

  const tone =
    normalizedSeverity === "critical"
      ? styles.pillCritical
      : normalizedSeverity === "warning"
        ? styles.pillWarning
        : styles.pillInfo;

  const textTone =
    normalizedSeverity === "critical"
      ? styles.pillTextCritical
      : normalizedSeverity === "warning"
        ? styles.pillTextWarning
        : styles.pillTextInfo;

  return (
    <View style={[styles.pill, tone]}>
      <Text style={[styles.pillText, textTone]}>{severity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
  },
  summaryNumber: {
    color: colors.white,
    fontSize: 38,
    fontWeight: "900",
  },
  summaryLabel: {
    color: colors.primarySoft,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: {
    color: "#6b7280",
  },
  message: {
    lineHeight: 22,
    color: "#374151",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillCritical: {
    backgroundColor: "#FEE2E2",
  },
  pillWarning: {
    backgroundColor: "#FEF3C7",
  },
  pillInfo: {
    backgroundColor: colors.primarySoft,
  },
  testButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
    marginTop: 4,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  testButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    flexDirection: "row",
    gap: 8,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  alertTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    flex: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dateText: {
    color: colors.mutedText,
    fontWeight: "700",
  },
  pillText: {
    fontWeight: "900",
    textTransform: "capitalize",
  },
  pillTextCritical: {
    color: colors.critical,
  },
  pillTextWarning: {
    color: "#92400E",
  },
  pillTextInfo: {
    color: colors.primaryDark,
  },
  severityIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  severityIconCritical: {
    backgroundColor: "#FEE2E2",
  },
  severityIconWarning: {
    backgroundColor: "#FEF3C7",
  },
  severityIconInfo: {
    backgroundColor: colors.primarySoft,
  },
});
