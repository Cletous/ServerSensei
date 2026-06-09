import { useEffect, useState } from "react";
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
import { router } from "expo-router";

import { clearToken } from "../../src/storage/authStorage";
import {
  createCommand,
  getDecisionEvaluation,
  getDevices,
} from "../../src/api/client";
import type { DecisionEvaluation, Device } from "../../src/types/api";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

export default function DashboardScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [evaluation, setEvaluation] = useState<DecisionEvaluation | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [sendingCommand, setSendingCommand] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard() {
    try {
      const deviceList = await getDevices();
      setDevices(deviceList);

      const targetDevice =
        deviceList.find((device) => device.device_id === selectedDeviceId) ||
        deviceList.find((device) => device.device_id === DEFAULT_DEVICE_ID) ||
        deviceList[0];

      if (!targetDevice) {
        setEvaluation(null);
        return;
      }

      setSelectedDeviceId(targetDevice.device_id);

      const decisionData = await getDecisionEvaluation(targetDevice.device_id);
      setEvaluation(decisionData);
    } catch (error) {
      Alert.alert(
        "Dashboard error",
        "Could not load dashboard. Check backend, JWT token, and network.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard();
  }

  async function handleLogout() {
    await clearToken();
    router.replace("/login");
  }

  async function sendCommand(
    action: string,
    payload?: Record<string, unknown>,
  ) {
    try {
      setSendingCommand(true);

      await createCommand({
        device_id: selectedDeviceId,
        action,
        payload,
      });

      Alert.alert(
        "Command queued",
        "The command has been sent to the backend. The ESP32 will execute it on its next command poll.",
      );

      await loadDashboard();
    } catch (error) {
      Alert.alert(
        "Command failed",
        "Could not send command. Check your login, backend, and device registration.",
      );
    } finally {
      setSendingCommand(false);
    }
  }

  async function setDeviceMode(mode: string) {
    await sendCommand("set_mode", { mode });
  }

  async function setLoadState(state: string) {
    await sendCommand("set_load_state", { state });
  }

  async function setBatteryPercent(batteryPercent: number) {
    await sendCommand("set_battery_percent", {
      battery_percent: batteryPercent,
    });
  }

  useEffect(() => {
    loadDashboard();

    const intervalId = setInterval(() => {
      loadDashboard();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ServerSensei</Text>
          <Text style={styles.subtitle}>Intelligent Monitoring Dashboard</Text>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {!evaluation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Device Data</Text>
          <Text>No telemetry has been received yet.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{evaluation.device_name}</Text>
            <Text style={styles.muted}>{evaluation.device_id}</Text>

            <View style={styles.statusRow}>
              <StatusPill
                label={evaluation.online ? "Online" : "Offline"}
                tone={evaluation.online ? "good" : "bad"}
              />
              <StatusPill
                label={evaluation.environmental_risk || "unknown"}
                tone={riskToTone(evaluation.environmental_risk)}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Decision Evaluation</Text>
            <Text style={styles.summary}>{evaluation.evaluation_summary}</Text>

            <Text style={styles.recommendationTitle}>Recommendation</Text>
            <Text style={styles.recommendation}>
              {evaluation.system_recommendation || "No recommendation yet."}
            </Text>
          </View>

          <View style={styles.grid}>
            <MetricCard
              label="Temperature"
              value={formatValue(evaluation.temperature, "°C")}
            />
            <MetricCard
              label="Humidity"
              value={formatValue(evaluation.humidity, "%")}
            />
            <MetricCard
              label="Battery"
              value={formatValue(evaluation.battery_percent, "%")}
            />
            <MetricCard
              label="Load"
              value={formatValue(evaluation.load_percent, "%")}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Power</Text>
            <InfoRow label="Source" value={evaluation.power_source || "--"} />
            <InfoRow
              label="Runtime"
              value={
                evaluation.estimated_runtime_minutes === null
                  ? "--"
                  : `${evaluation.estimated_runtime_minutes} min`
              }
            />
            <InfoRow label="Mode" value={evaluation.mode} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Air Quality</Text>
            <InfoRow
              label="Status"
              value={evaluation.air_quality_status || "--"}
            />
            <InfoRow
              label="Raw"
              value={
                evaluation.air_quality_raw === null
                  ? "--"
                  : String(evaluation.air_quality_raw)
              }
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Alerts</Text>
            <Text style={styles.muted}>
              Count: {evaluation.alert_count_recent} | Highest:{" "}
              {evaluation.highest_recent_severity || "none"}
            </Text>

            {evaluation.recent_alerts.length === 0 ? (
              <Text style={styles.emptyText}>No recent alerts.</Text>
            ) : (
              evaluation.recent_alerts.map((alert, index) => (
                <View key={`${alert.alert_type}-${index}`} style={styles.alert}>
                  <Text style={styles.alertType}>{alert.alert_type}</Text>
                  <Text style={styles.muted}>{alert.severity}</Text>
                  <Text>{alert.message}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <View style={[styles.pill, styles[`pill_${tone}`]]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function CommandButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.commandButton, disabled && styles.commandButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.commandButtonText}>{label}</Text>
    </Pressable>
  );
}

function riskToTone(risk: string | null): "good" | "warn" | "bad" | "neutral" {
  if (risk === "normal") return "good";
  if (risk === "warning" || risk === "high") return "warn";
  if (risk === "critical") return "bad";
  return "neutral";
}

function formatValue(value: number | null, suffix: string): string {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${value.toFixed(1)}${suffix}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6b7280",
  },
  logoutButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoutText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  muted: {
    color: "#6b7280",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pill_good: {
    backgroundColor: "#dcfce7",
  },
  pill_warn: {
    backgroundColor: "#fef3c7",
  },
  pill_bad: {
    backgroundColor: "#fee2e2",
  },
  pill_neutral: {
    backgroundColor: "#e5e7eb",
  },
  pillText: {
    fontWeight: "700",
  },
  summary: {
    fontSize: 16,
    lineHeight: 23,
  },
  recommendationTitle: {
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 4,
  },
  recommendation: {
    color: "#374151",
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    width: "47%",
  },
  metricLabel: {
    color: "#6b7280",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  infoLabel: {
    color: "#6b7280",
  },
  infoValue: {
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 10,
    color: "#6b7280",
  },
  alert: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  alertType: {
    fontWeight: "800",
  },
  commandSectionTitle: {
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
  },
  commandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  commandButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  commandButtonDisabled: {
    opacity: 0.6,
  },
  commandButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  settingsButton: {
    backgroundColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
