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

import { getDecisionEvaluation } from "../../src/api/client";
import { colors } from "../../src/theme/colors";
import type { DecisionEvaluation } from "../../src/types/api";
import { formatDateTime } from "../../src/utils/dateTime";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

export default function DigitalTwinScreen() {
  const insets = useSafeAreaInsets();

  const [evaluation, setEvaluation] = useState<DecisionEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDigitalTwin() {
    try {
      const data = await getDecisionEvaluation(DEFAULT_DEVICE_ID);
      setEvaluation(data);
    } catch (error) {
      Alert.alert(
        "Digital twin error",
        "Could not load the live infrastructure state.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDigitalTwin();

    const intervalId = setInterval(loadDigitalTwin, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const health = useMemo(() => {
    if (!evaluation) {
      return 0;
    }

    let score = 100;

    if (!evaluation.online) {
      score -= 35;
    }

    if (evaluation.environmental_risk === "critical") {
      score -= 30;
    } else if (evaluation.environmental_risk === "warning") {
      score -= 15;
    }

    if ((evaluation.battery_percent ?? 100) < 25) {
      score -= 20;
    }

    if ((evaluation.estimated_runtime_minutes ?? 999) < 1) {
      score -= 15;
    }

    if (evaluation.highest_recent_severity === "critical") {
      score -= 20;
    } else if (evaluation.highest_recent_severity === "warning") {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }, [evaluation]);

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
        <Text style={styles.loadingText}>Loading digital twin...</Text>
      </View>
    );
  }

  const powerSource = evaluation?.power_source || "unknown";
  const battery = evaluation?.battery_percent ?? 0;
  const load = evaluation?.load_percent ?? 0;
  const runtime = evaluation?.estimated_runtime_minutes;
  const risk = evaluation?.environmental_risk || "unknown";
  const mode = evaluation?.mode || "unknown";

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
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadDigitalTwin();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Operations Center</Text>
        <Text style={styles.title}>Digital Twin</Text>
        <Text style={styles.subtitle}>
          Live visual model of power, cooling, load, and simulated server relay
          states.
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Infrastructure Health</Text>
            <View style={styles.healthRow}>
              <Text style={styles.healthScore}>{health}</Text>
              <Text style={styles.healthSuffix}>/100</Text>
            </View>
          </View>

          <View
            style={[
              styles.liveBadge,
              {
                backgroundColor: evaluation?.online
                  ? colors.primarySoft
                  : "#FEE2E2",
                borderColor: evaluation?.online
                  ? colors.primary
                  : colors.critical,
              },
            ]}
          >
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor: evaluation?.online
                    ? colors.primary
                    : colors.critical,
                },
              ]}
            />
            <Text
              style={[
                styles.liveText,
                {
                  color: evaluation?.online
                    ? colors.primaryDark
                    : colors.critical,
                },
              ]}
            >
              {evaluation?.online ? "LIVE" : "OFFLINE"}
            </Text>
          </View>
        </View>

        <View style={styles.healthTrack}>
          <View
            style={[
              styles.healthFill,
              {
                width: `${health}%`,
                backgroundColor: getHealthColor(health),
              },
            ]}
          />
        </View>

        <Text style={styles.heroSummary}>
          {evaluation?.evaluation_summary ||
            evaluation?.system_recommendation ||
            "Waiting for the decision engine to produce a live system summary."}
        </Text>
      </View>

      <View style={styles.twinMap}>
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.mapTitle}>Server Room Model</Text>
            <Text style={styles.mapSubtitle}>
              Data refreshes automatically every 5 seconds.
            </Text>
          </View>

          <Ionicons
            name="git-network-outline"
            size={24}
            color={colors.primaryDark}
          />
        </View>

        <View style={styles.pipeline}>
          <TwinNode
            icon="flash-outline"
            title="Power Source"
            value={powerSource.toUpperCase()}
            tone={getPowerTone(powerSource)}
          />

          <Connector />

          <TwinNode
            icon="battery-half-outline"
            title="UPS Battery"
            value={`${battery.toFixed(0)}%`}
            tone={battery < 25 ? colors.critical : colors.success}
          />

          <Connector />

          <TwinNode
            icon="speedometer-outline"
            title="Active Load"
            value={`${load.toFixed(0)}%`}
            tone={load >= 80 ? colors.warning : colors.secondary}
          />
        </View>

        <View style={styles.roomGrid}>
          <View style={styles.leftColumn}>
            <CoolingUnit
              fanOn={evaluation?.fan_on}
              reason={evaluation?.cooling_reason}
              risk={risk}
            />

            <PowerRuntimeCard
              runtime={runtime}
              mode={mode}
              latestTelemetryAt={evaluation?.latest_telemetry_at}
            />
          </View>

          <View style={styles.serverRack}>
            <View style={styles.rackHeader}>
              <Ionicons
                name="server-outline"
                size={22}
                color={colors.primaryDark}
              />
              <Text style={styles.rackTitle}>Server Rack</Text>
            </View>

            <ServerNode
              title="Critical Server A"
              critical
              isOn={evaluation?.critical_server_a_on}
            />

            <ServerNode
              title="Critical Server B"
              critical
              isOn={evaluation?.critical_server_b_on}
            />

            <ServerNode
              title="Non-Critical Server A"
              isOn={evaluation?.non_critical_server_a_on}
            />

            <ServerNode
              title="Non-Critical Server B"
              isOn={evaluation?.non_critical_server_b_on}
            />
          </View>
        </View>
      </View>

      <View style={styles.statusGrid}>
        <StatusTile
          icon="thermometer-outline"
          label="Temperature"
          value={
            evaluation?.temperature == null
              ? "N/A"
              : `${evaluation.temperature.toFixed(1)} °C`
          }
          tone={getRiskTone(risk)}
        />

        <StatusTile
          icon="water-outline"
          label="Humidity"
          value={
            evaluation?.humidity == null
              ? "N/A"
              : `${evaluation.humidity.toFixed(1)} %`
          }
          tone={colors.info}
        />

        <StatusTile
          icon="cloud-outline"
          label="Air Quality"
          value={
            evaluation?.air_quality_raw == null
              ? "N/A"
              : `${evaluation.air_quality_raw}`
          }
          tone={getAirQualityTone(evaluation?.air_quality_status)}
        />

        <StatusTile
          icon="warning-outline"
          label="Recent Alerts"
          value={`${evaluation?.alert_count_recent ?? 0}`}
          tone={
            evaluation?.alert_count_recent ? colors.warning : colors.success
          }
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

          <Text style={styles.recommendationTitle}>Decision Engine</Text>
        </View>

        <Text style={styles.recommendationText}>
          {evaluation?.system_recommendation ||
            "No recommendation available yet."}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => router.push("/commands")}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={20}
            color={colors.white}
          />
          <Text style={styles.actionButtonText}>Open Controls</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/alerts")}
          style={({ pressed }) => [
            styles.secondaryActionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={colors.primaryDark}
          />
          <Text style={styles.secondaryActionButtonText}>View Alerts</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function TwinNode({
  icon,
  title,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.twinNode}>
      <View
        style={[
          styles.twinIcon,
          {
            backgroundColor: softenColor(tone),
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={tone} />
      </View>

      <Text style={styles.twinNodeTitle}>{title}</Text>
      <Text style={[styles.twinNodeValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function Connector() {
  return (
    <View style={styles.connector}>
      <View style={styles.connectorLine} />
      <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
    </View>
  );
}

function CoolingUnit({
  fanOn,
  reason,
  risk,
}: {
  fanOn: boolean | null | undefined;
  reason: string | null | undefined;
  risk: string;
}) {
  const active = Boolean(fanOn);
  const tone = active ? colors.info : colors.mutedText;

  return (
    <View style={styles.coolingCard}>
      <View style={styles.coolingTop}>
        <View
          style={[
            styles.coolingIcon,
            {
              backgroundColor: active ? "#DBEAFE" : colors.secondarySoft,
            },
          ]}
        >
          <Ionicons name="snow-outline" size={24} color={tone} />
        </View>

        <View style={styles.coolingTextBlock}>
          <Text style={styles.coolingTitle}>Cooling Unit</Text>
          <Text style={[styles.coolingStatus, { color: tone }]}>
            {active ? "FAN ACTIVE" : "FAN STANDBY"}
          </Text>
        </View>
      </View>

      <Text style={styles.coolingReason}>
        {reason || `Environmental risk: ${risk}`}
      </Text>
    </View>
  );
}

function PowerRuntimeCard({
  runtime,
  mode,
  latestTelemetryAt,
}: {
  runtime: number | null | undefined;
  mode: string;
  latestTelemetryAt: string | null | undefined;
}) {
  return (
    <View style={styles.runtimeCard}>
      <View style={styles.runtimeTop}>
        <Ionicons name="time-outline" size={22} color={colors.primaryDark} />
        <Text style={styles.runtimeTitle}>Runtime Prediction</Text>
      </View>

      <Text style={styles.runtimeValue}>
        {runtime == null ? "N/A" : `${runtime.toFixed(1)} min`}
      </Text>

      <Text style={styles.runtimeMeta}>Mode: {mode.toUpperCase()}</Text>

      <Text style={styles.runtimeDate}>
        Latest telemetry:{" "}
        {latestTelemetryAt ? formatDateTime(latestTelemetryAt) : "N/A"}
      </Text>
    </View>
  );
}

function ServerNode({
  title,
  critical = false,
  isOn,
}: {
  title: string;
  critical?: boolean;
  isOn: boolean | null | undefined;
}) {
  const online = Boolean(isOn);
  const tone = online ? colors.success : colors.critical;

  return (
    <View
      style={[
        styles.serverNode,
        {
          borderColor: critical ? "#FECACA" : colors.border,
          backgroundColor: critical ? "#FFFBFB" : colors.card,
        },
      ]}
    >
      <View
        style={[
          styles.serverLight,
          {
            backgroundColor: tone,
          },
        ]}
      />

      <View style={styles.serverTextBlock}>
        <Text style={styles.serverTitle}>{title}</Text>
        <Text style={styles.serverMeta}>
          {critical ? "Critical workload" : "Non-critical workload"}
        </Text>
      </View>

      <View
        style={[
          styles.serverBadge,
          {
            backgroundColor: online ? colors.primarySoft : "#FEE2E2",
          },
        ]}
      >
        <Text
          style={[
            styles.serverBadgeText,
            {
              color: tone,
            },
          ]}
        >
          {online ? "ON" : "OFF"}
        </Text>
      </View>
    </View>
  );
}

function StatusTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={styles.statusTile}>
      <View
        style={[
          styles.statusIcon,
          {
            backgroundColor: softenColor(tone),
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={tone} />
      </View>

      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

function getHealthColor(score: number) {
  if (score >= 80) {
    return colors.success;
  }

  if (score >= 55) {
    return colors.warning;
  }

  return colors.critical;
}

function getPowerTone(powerSource: string) {
  const normalized = powerSource.toLowerCase();

  if (normalized === "grid") {
    return colors.success;
  }

  if (normalized === "generator") {
    return colors.info;
  }

  if (normalized === "ups") {
    return colors.warning;
  }

  return colors.mutedText;
}

function getRiskTone(risk: string) {
  if (risk === "critical") {
    return colors.critical;
  }

  if (risk === "warning") {
    return colors.warning;
  }

  return colors.success;
}

function getAirQualityTone(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (normalized.includes("hazard") || normalized.includes("poor")) {
    return colors.critical;
  }

  if (normalized.includes("moderate")) {
    return colors.warning;
  }

  if (normalized.includes("good")) {
    return colors.success;
  }

  return colors.info;
}

function softenColor(color: string) {
  if (color === colors.success) {
    return colors.primarySoft;
  }

  if (color === colors.warning) {
    return "#FEF3C7";
  }

  if (color === colors.critical) {
    return "#FEE2E2";
  }

  if (color === colors.info) {
    return "#DBEAFE";
  }

  if (color === colors.secondary) {
    return colors.secondarySoft;
  }

  return colors.background;
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
  },

  loadingText: {
    color: colors.mutedText,
    fontWeight: "800",
    marginTop: 10,
  },

  header: {
    marginBottom: 16,
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

  heroCard: {
    backgroundColor: colors.secondary,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  heroLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  healthRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
  },

  healthScore: {
    color: colors.white,
    fontSize: 44,
    fontWeight: "900",
  },

  healthSuffix: {
    color: "#CBD5E1",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    marginLeft: 3,
  },

  liveBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
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

  healthTrack: {
    height: 10,
    backgroundColor: "#334155",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
  },

  healthFill: {
    height: "100%",
    borderRadius: 999,
  },

  heroSummary: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 14,
  },

  twinMap: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
  },

  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  mapTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
  },

  mapSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  pipeline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  twinNode: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
    minHeight: 104,
  },

  twinIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  twinNodeTitle: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  twinNodeValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },

  connector: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  connectorLine: {
    width: 18,
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 999,
    marginBottom: -9,
  },

  roomGrid: {
    gap: 14,
  },

  leftColumn: {
    gap: 12,
  },

  coolingCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },

  coolingTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  coolingIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  coolingTextBlock: {
    flex: 1,
  },

  coolingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  coolingStatus: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },

  coolingReason: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 10,
  },

  runtimeCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },

  runtimeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  runtimeTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },

  runtimeValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10,
  },

  runtimeMeta: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },

  runtimeDate: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 8,
  },

  serverRack: {
    backgroundColor: "#F8FAFC",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
  },

  rackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  rackTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },

  serverNode: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  serverLight: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },

  serverTextBlock: {
    flex: 1,
  },

  serverTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },

  serverMeta: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  serverBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  serverBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },

  statusTile: {
    width: "48%",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },

  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  statusLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  statusValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 5,
  },

  recommendationCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },

  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  recommendationIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
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

  actionRow: {
    flexDirection: "row",
    gap: 12,
  },

  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  secondaryActionButton: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  actionButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },

  actionButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },

  secondaryActionButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
});
