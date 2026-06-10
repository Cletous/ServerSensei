import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getDecisionEvaluation } from "../../src/api/client";
import { colors } from "../../src/theme/colors";
import type { DecisionEvaluation } from "../../src/types/api";
import { formatDateTime } from "../../src/utils/dateTime";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

export default function PowerScreen() {
  const insets = useSafeAreaInsets();

  const [evaluation, setEvaluation] = useState<DecisionEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadPower() {
    try {
      const data = await getDecisionEvaluation(DEFAULT_DEVICE_ID);
      setEvaluation(data);
    } catch (error) {
      Alert.alert("Power error", "Could not load power status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPower();

    const intervalId = setInterval(loadPower, 10000);
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
        <Text style={styles.loadingText}>Loading power status...</Text>
      </View>
    );
  }

  const battery = evaluation?.battery_percent ?? 0;
  const load = evaluation?.load_percent ?? 0;
  const runtime = evaluation?.estimated_runtime_minutes;

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadPower();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Power</Text>
        <Text style={styles.title}>UPS & Load Status</Text>
        <Text style={styles.subtitle}>
          Power source, simulated UPS capacity, runtime prediction, and load.
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>Current Power Source</Text>
          <Text style={styles.heroValue}>
            {(evaluation?.power_source || "unknown").toUpperCase()}
          </Text>
          <Text style={styles.heroMeta}>
            Last power update:{" "}
            {evaluation?.power_updated_at
              ? formatDateTime(evaluation.power_updated_at)
              : "Not available"}
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Ionicons name="flash-outline" size={32} color={colors.primaryDark} />
        </View>
      </View>

      <View style={styles.panel}>
        <PanelHeader
          title="Battery Capacity"
          value={`${battery.toFixed(0)}%`}
          icon="battery-half-outline"
        />
        <ProgressBar percent={battery} />
      </View>

      <View style={styles.panel}>
        <PanelHeader
          title="Active Load"
          value={`${load.toFixed(0)}%`}
          icon="speedometer-outline"
        />
        <ProgressBar percent={load} />
      </View>

      <View style={styles.runtimeCard}>
        <View style={styles.runtimeIcon}>
          <Ionicons name="time-outline" size={26} color={colors.primaryDark} />
        </View>

        <View>
          <Text style={styles.runtimeLabel}>Estimated Remaining Runtime</Text>
          <Text style={styles.runtimeValue}>
            {runtime == null ? "N/A" : `${runtime.toFixed(1)} min`}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function PanelHeader({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.panelHeader}>
      <View style={styles.panelTitleRow}>
        <View style={styles.smallIcon}>
          <Ionicons name={icon} size={18} color={colors.primaryDark} />
        </View>
        <Text style={styles.panelTitle}>{title}</Text>
      </View>

      <Text style={styles.panelValue}>{value}</Text>
    </View>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${safePercent}%`,
          },
        ]}
      />
    </View>
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  loadingText: {
    color: colors.mutedText,
    fontWeight: "700",
    marginTop: 10,
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

  heroCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
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

  heroValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },

  heroMeta: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  panel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },

  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  smallIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  panelTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },

  panelValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },

  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.secondarySoft,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },

  runtimeCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  runtimeIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  runtimeLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  runtimeValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
});
