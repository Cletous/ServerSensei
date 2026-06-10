import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { getDecisionEvaluation, getDevices } from "../../src/api/client";
import { colors } from "../../src/theme/colors";
import type {
  DecisionEvaluation,
  Device,
  RecentAlert,
} from "../../src/types/api";
import { formatDateTime } from "../../src/utils/dateTime";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  const [devices, setDevices] = useState<Device[]>([]);
  const [evaluation, setEvaluation] = useState<DecisionEvaluation | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(DEFAULT_DEVICE_ID);

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
        "Overview error",
        "Could not load system overview. Check backend, JWT token, and network.",
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

  useEffect(() => {
    loadDashboard();

    const intervalId = setInterval(loadDashboard, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const healthScore = useMemo(
    () => calculateHealthScore(evaluation),
    [evaluation],
  );

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
        <Text style={styles.loadingText}>Loading ServerSensei overview...</Text>
      </View>
    );
  }

  if (!evaluation) {
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
        <Ionicons name="server-outline" size={42} color={colors.mutedText} />
        <Text style={styles.emptyTitle}>No device available</Text>
        <Text style={styles.emptyText}>
          Register or connect your ESP32 device to view the operations overview.
        </Text>

        <Pressable style={styles.primaryButton} onPress={loadDashboard}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const statusTone = getSystemTone(evaluation);
  const recentAlerts = evaluation.recent_alerts || [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 28,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ServerSensei Operations</Text>
          <Text style={styles.title}>Overview</Text>
        </View>

        <View
          style={[
            styles.livePill,
            {
              backgroundColor: evaluation.online
                ? colors.primarySoft
                : "#FEF2F2",
              borderColor: evaluation.online ? colors.primary : colors.critical,
            },
          ]}
        >
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: evaluation.online
                  ? colors.success
                  : colors.critical,
              },
            ]}
          />
          <Text
            style={[
              styles.liveText,
              {
                color: evaluation.online ? colors.primaryDark : colors.critical,
              },
            ]}
          >
            {evaluation.online ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      <View style={styles.deviceCard}>
        <View style={styles.deviceIcon}>
          <Ionicons
            name="hardware-chip-outline"
            size={24}
            color={colors.primaryDark}
          />
        </View>

        <View style={styles.deviceText}>
          <Text style={styles.deviceName}>{evaluation.device_name}</Text>
          <Text style={styles.deviceMeta}>{evaluation.device_id}</Text>
          <Text style={styles.deviceMeta}>
            Last telemetry:{" "}
            {evaluation.latest_telemetry_at
              ? formatDateTime(evaluation.latest_telemetry_at)
              : "Not available"}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.heroCard,
          {
            borderColor: statusTone.border,
            backgroundColor: statusTone.background,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroLabel}>System Health Score</Text>
            <Text style={styles.heroScore}>{healthScore}</Text>
            <Text style={styles.heroScoreSuffix}>/100</Text>
          </View>

          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: statusTone.iconBackground,
              },
            ]}
          >
            <Ionicons
              name={statusTone.icon}
              size={34}
              color={statusTone.color}
            />
          </View>
        </View>

        <View style={styles.healthBarTrack}>
          <View
            style={[
              styles.healthBarFill,
              {
                width: `${healthScore}%`,
                backgroundColor: statusTone.color,
              },
            ]}
          />
        </View>

        <Text style={styles.heroStatus}>{statusTone.title}</Text>
        <Text style={styles.heroDescription}>
          {evaluation.evaluation_summary ||
            evaluation.system_recommendation ||
            "System status is being evaluated from latest telemetry."}
        </Text>
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard
          icon="thermometer-outline"
          title="Temperature"
          value={
            evaluation.temperature == null
              ? "N/A"
              : `${evaluation.temperature.toFixed(1)} °C`
          }
          subtitle={`Risk: ${evaluation.environmental_risk || "unknown"}`}
          tone={getRiskColor(evaluation.environmental_risk)}
          onPress={() => router.push("/environment")}
        />

        <KpiCard
          icon="water-outline"
          title="Humidity"
          value={
            evaluation.humidity == null
              ? "N/A"
              : `${evaluation.humidity.toFixed(1)} %`
          }
          subtitle={evaluation.air_quality_status || "Air quality unknown"}
          tone={colors.info}
          onPress={() => router.push("/environment")}
        />

        <KpiCard
          icon="flash-outline"
          title="Power Source"
          value={(evaluation.power_source || "unknown").toUpperCase()}
          subtitle={`Battery ${formatPercent(evaluation.battery_percent)}`}
          tone={getPowerColor(evaluation.power_source)}
          onPress={() => router.push("/power")}
        />

        <KpiCard
          icon="time-outline"
          title="Runtime"
          value={
            evaluation.estimated_runtime_minutes == null
              ? "N/A"
              : `${evaluation.estimated_runtime_minutes.toFixed(1)} min`
          }
          subtitle={`Load ${formatPercent(evaluation.load_percent)}`}
          tone={colors.secondary}
          onPress={() => router.push("/power")}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Navigation</Text>
        <Text style={styles.sectionSubtitle}>
          Focused views, not crowded panels
        </Text>
      </View>

      <View style={styles.actionGrid}>
        <ActionCard
          icon="pulse-outline"
          title="Monitor"
          subtitle="Environment, power, and trends"
          onPress={() => router.push("/monitor")}
        />

        <ActionCard
          icon="snow-outline"
          title="Operations"
          subtitle="Cooling and server controls"
          onPress={() => router.push("/commands")}
        />

        <ActionCard
          icon="warning-outline"
          title="Alerts"
          subtitle={`${evaluation.alert_count_recent} recent incident(s)`}
          onPress={() => router.push("/alerts")}
        />

        <ActionCard
          icon="settings-outline"
          title="Settings"
          subtitle="Thresholds and runtime config"
          onPress={() => router.push("/settings")}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Infrastructure Snapshot</Text>
        <Text style={styles.sectionSubtitle}>
          Current simulated relay state
        </Text>
      </View>

      <View style={styles.serverGrid}>
        <ServerMiniCard
          title="Critical A"
          critical
          isOn={evaluation.critical_server_a_on}
        />
        <ServerMiniCard
          title="Critical B"
          critical
          isOn={evaluation.critical_server_b_on}
        />
        <ServerMiniCard
          title="Non-Critical A"
          isOn={evaluation.non_critical_server_a_on}
        />
        <ServerMiniCard
          title="Non-Critical B"
          isOn={evaluation.non_critical_server_b_on}
        />
      </View>

      <View style={styles.recommendationCard}>
        <View style={styles.recommendationHeader}>
          <View style={styles.recommendationIcon}>
            <Ionicons
              name="bulb-outline"
              size={20}
              color={colors.primaryDark}
            />
          </View>

          <Text style={styles.recommendationTitle}>
            Decision Recommendation
          </Text>
        </View>

        <Text style={styles.recommendationText}>
          {evaluation.system_recommendation ||
            "No recommendation available from the decision engine yet."}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        <Pressable onPress={() => router.push("/alerts")}>
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>

      <View style={styles.alertCard}>
        {recentAlerts.length === 0 ? (
          <View style={styles.noAlertBox}>
            <Ionicons
              name="checkmark-circle-outline"
              size={26}
              color={colors.success}
            />
            <View>
              <Text style={styles.noAlertTitle}>No recent alerts</Text>
              <Text style={styles.noAlertText}>
                The backend has not reported recent warning or critical events.
              </Text>
            </View>
          </View>
        ) : (
          recentAlerts
            .slice(0, 3)
            .map((alert, index) => (
              <RecentAlertRow
                key={`${alert.alert_type}-${alert.created_at}-${index}`}
                alert={alert}
              />
            ))
        )}
      </View>

      <Text style={styles.footerText}>
        Monitoring {devices.length} registered device
        {devices.length === 1 ? "" : "s"}.
      </Text>
    </ScrollView>
  );
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  subtitle: string;
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.kpiCard, pressed && styles.cardPressed]}
    >
      <View
        style={[
          styles.kpiIcon,
          {
            backgroundColor: softenColor(tone),
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={tone} />
      </View>

      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={colors.primaryDark} />
      </View>

      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={18}
        color={colors.mutedText}
      />
    </Pressable>
  );
}

function ServerMiniCard({
  title,
  isOn,
  critical = false,
}: {
  title: string;
  isOn: boolean | null;
  critical?: boolean;
}) {
  const powered = Boolean(isOn);

  return (
    <View style={[styles.serverCard, critical && styles.serverCardCritical]}>
      <View style={styles.serverTopRow}>
        <Ionicons
          name={critical ? "shield-checkmark-outline" : "server-outline"}
          size={20}
          color={critical ? colors.critical : colors.primaryDark}
        />

        <View
          style={[
            styles.serverDot,
            {
              backgroundColor: powered ? colors.success : colors.mutedText,
            },
          ]}
        />
      </View>

      <Text style={styles.serverTitle}>{title}</Text>
      <Text
        style={[
          styles.serverState,
          {
            color: powered ? colors.success : colors.mutedText,
          },
        ]}
      >
        {powered ? "POWERED ON" : "POWERED OFF"}
      </Text>
    </View>
  );
}

function RecentAlertRow({ alert }: { alert: RecentAlert }) {
  const severityColor = getSeverityColor(alert.severity);

  return (
    <View style={styles.alertRow}>
      <View
        style={[
          styles.alertIcon,
          {
            backgroundColor: softenColor(severityColor),
          },
        ]}
      >
        <Ionicons
          name={
            alert.severity?.toLowerCase() === "critical"
              ? "alert-circle-outline"
              : "warning-outline"
          }
          size={20}
          color={severityColor}
        />
      </View>

      <View style={styles.alertText}>
        <Text style={styles.alertTitle}>{alert.message}</Text>
        <Text style={styles.alertMeta}>
          {alert.severity.toUpperCase()} · {formatDateTime(alert.created_at)}
        </Text>
      </View>
    </View>
  );
}

function calculateHealthScore(evaluation: DecisionEvaluation | null) {
  if (!evaluation) {
    return 0;
  }

  let score = 100;

  if (!evaluation.online) {
    score -= 40;
  }

  const risk = (evaluation.environmental_risk || "").toLowerCase();

  if (risk.includes("hazard") || risk.includes("critical")) {
    score -= 30;
  } else if (risk.includes("poor") || risk.includes("high")) {
    score -= 20;
  } else if (risk.includes("moderate") || risk.includes("warning")) {
    score -= 10;
  }

  const severity = (evaluation.highest_recent_severity || "").toLowerCase();

  if (severity === "critical") {
    score -= 25;
  } else if (severity === "warning") {
    score -= 12;
  }

  const battery = evaluation.battery_percent ?? 100;
  const runtime = evaluation.estimated_runtime_minutes ?? 60;

  if (battery <= 10) {
    score -= 25;
  } else if (battery <= 25) {
    score -= 12;
  }

  if (runtime <= 0.35) {
    score -= 25;
  } else if (runtime <= 0.75) {
    score -= 12;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSystemTone(evaluation: DecisionEvaluation) {
  if (!evaluation.online) {
    return {
      title: "Device Offline",
      color: colors.critical,
      border: "#FECACA",
      background: "#FEF2F2",
      iconBackground: "#FEE2E2",
      icon: "cloud-offline-outline" as keyof typeof Ionicons.glyphMap,
    };
  }

  const severity = (evaluation.highest_recent_severity || "").toLowerCase();
  const risk = (evaluation.environmental_risk || "").toLowerCase();

  if (
    severity === "critical" ||
    risk.includes("critical") ||
    risk.includes("hazard")
  ) {
    return {
      title: "Critical Attention Required",
      color: colors.critical,
      border: "#FECACA",
      background: "#FEF2F2",
      iconBackground: "#FEE2E2",
      icon: "alert-circle-outline" as keyof typeof Ionicons.glyphMap,
    };
  }

  if (
    severity === "warning" ||
    risk.includes("poor") ||
    risk.includes("high") ||
    risk.includes("moderate")
  ) {
    return {
      title: "Warning Conditions Detected",
      color: colors.warning,
      border: "#FED7AA",
      background: "#FFFBEB",
      iconBackground: "#FEF3C7",
      icon: "warning-outline" as keyof typeof Ionicons.glyphMap,
    };
  }

  return {
    title: "System Operating Normally",
    color: colors.success,
    border: "#BBF7D0",
    background: colors.card,
    iconBackground: colors.primarySoft,
    icon: "shield-checkmark-outline" as keyof typeof Ionicons.glyphMap,
  };
}

function getRiskColor(risk: string | null) {
  const normalized = (risk || "").toLowerCase();

  if (
    normalized.includes("critical") ||
    normalized.includes("hazard") ||
    normalized.includes("poor")
  ) {
    return colors.critical;
  }

  if (normalized.includes("moderate") || normalized.includes("warning")) {
    return colors.warning;
  }

  if (normalized.includes("good") || normalized.includes("normal")) {
    return colors.success;
  }

  return colors.info;
}

function getPowerColor(powerSource: string | null) {
  const normalized = (powerSource || "").toLowerCase();

  if (normalized.includes("grid")) {
    return colors.success;
  }

  if (normalized.includes("generator")) {
    return colors.info;
  }

  if (normalized.includes("ups") || normalized.includes("battery")) {
    return colors.warning;
  }

  return colors.secondary;
}

function getSeverityColor(severity: string | null) {
  const normalized = (severity || "").toLowerCase();

  if (normalized === "critical") {
    return colors.critical;
  }

  if (normalized === "warning") {
    return colors.warning;
  }

  return colors.info;
}

function formatPercent(value: number | null) {
  if (value == null) {
    return "N/A";
  }

  return `${value.toFixed(0)}%`;
}

function softenColor(color: string) {
  if (color === colors.critical) {
    return "#FEF2F2";
  }

  if (color === colors.warning) {
    return "#FFFBEB";
  }

  if (color === colors.info) {
    return "#EFF6FF";
  }

  if (color === colors.secondary) {
    return "#F1F5F9";
  }

  return colors.primarySoft;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 18,
  },

  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingText: {
    color: colors.mutedText,
    fontWeight: "800",
    marginTop: 10,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 14,
  },

  emptyText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 16,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
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
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },

  livePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  liveText: {
    fontSize: 11,
    fontWeight: "900",
  },

  deviceCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  deviceText: {
    flex: 1,
  },

  deviceName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  deviceMeta: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },

  heroLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  heroScore: {
    color: colors.text,
    fontSize: 56,
    fontWeight: "900",
    marginTop: 4,
    lineHeight: 62,
  },

  heroScoreSuffix: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: "900",
  },

  heroIcon: {
    width: 66,
    height: 66,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  healthBarTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.secondarySoft,
    overflow: "hidden",
    marginTop: 16,
  },

  healthBarFill: {
    height: "100%",
    borderRadius: 999,
  },

  heroStatus: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 16,
  },

  heroDescription: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  kpiCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    minHeight: 160,
  },

  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },

  kpiIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  kpiTitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  kpiValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 7,
  },

  kpiSubtitle: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 5,
  },

  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
  },

  viewAllText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },

  actionGrid: {
    gap: 12,
  },

  actionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    flex: 1,
  },

  actionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },

  actionSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  serverGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  serverCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },

  serverCardCritical: {
    borderColor: "#FECACA",
  },

  serverTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  serverDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  serverTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 12,
  },

  serverState: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5,
  },

  recommendationCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginTop: 18,
  },

  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  recommendationIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  recommendationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  recommendationText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 12,
  },

  alertCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
  },

  alertRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  alertText: {
    flex: 1,
  },

  alertTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },

  alertMeta: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },

  noAlertBox: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 8,
  },

  noAlertTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },

  noAlertText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2,
  },

  footerText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 18,
  },
});
