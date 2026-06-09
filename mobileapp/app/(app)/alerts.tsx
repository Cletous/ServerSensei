import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  async function loadAlerts() {
    try {
      const data = await getDeviceAlerts(DEFAULT_DEVICE_ID);
      setAlerts(data);
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
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.subtitle}>
          Latest environmental, power, runtime, and decision alerts.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{alerts.length}</Text>
        <Text style={styles.summaryLabel}>recent alerts</Text>
      </View>

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
              <Text style={styles.cardTitle}>{item.alert_type}</Text>
              <SeverityPill severity={item.severity} />
            </View>

            <Text style={styles.message}>{item.message}</Text>

            <Text style={styles.dateText}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const tone =
    severity === "critical"
      ? styles.pillCritical
      : severity === "warning"
        ? styles.pillWarning
        : styles.pillInfo;

  return (
    <View style={[styles.pill, tone]}>
      <Text style={styles.pillText}>{severity}</Text>
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6b7280",
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
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
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  muted: {
    color: "#6b7280",
  },
  message: {
    lineHeight: 22,
    color: "#374151",
  },
  dateText: {
    marginTop: 10,
    color: "#6b7280",
    fontWeight: "700",
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
  pillText: {
    fontWeight: "800",
    textTransform: "capitalize",
  },
});
