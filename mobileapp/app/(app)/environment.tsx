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

export default function EnvironmentScreen() {
  const insets = useSafeAreaInsets();

  const [evaluation, setEvaluation] = useState<DecisionEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadEnvironment() {
    try {
      const data = await getDecisionEvaluation(DEFAULT_DEVICE_ID);
      setEvaluation(data);
    } catch (error) {
      Alert.alert("Environment error", "Could not load environmental status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEnvironment();

    const intervalId = setInterval(loadEnvironment, 10000);
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
        <Text style={styles.loadingText}>Loading environment...</Text>
      </View>
    );
  }

  const risk = evaluation?.environmental_risk || "unknown";

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
            loadEnvironment();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Environment</Text>
        <Text style={styles.title}>Room Conditions</Text>
        <Text style={styles.subtitle}>
          Temperature, humidity, air quality, and cooling risk.
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>Environmental Risk</Text>
          <Text style={styles.heroValue}>{risk.toUpperCase()}</Text>
          <Text style={styles.heroMeta}>
            Latest telemetry:{" "}
            {evaluation?.latest_telemetry_at
              ? formatDateTime(evaluation.latest_telemetry_at)
              : "Not available"}
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Ionicons
            name="thermometer-outline"
            size={32}
            color={colors.primaryDark}
          />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard
          title="Temperature"
          value={
            evaluation?.temperature == null
              ? "N/A"
              : `${evaluation.temperature.toFixed(1)} °C`
          }
          icon="thermometer-outline"
        />

        <MetricCard
          title="Humidity"
          value={
            evaluation?.humidity == null
              ? "N/A"
              : `${evaluation.humidity.toFixed(1)} %`
          }
          icon="water-outline"
        />

        <MetricCard
          title="Air Quality"
          value={
            evaluation?.air_quality_raw == null
              ? "N/A"
              : String(evaluation.air_quality_raw)
          }
          subtitle={evaluation?.air_quality_status || "Unknown"}
          icon="cloud-outline"
        />

        <MetricCard
          title="Cooling Fan"
          value={evaluation?.fan_on ? "ON" : "OFF"}
          subtitle={evaluation?.cooling_reason || "No cooling reason available"}
          icon="snow-outline"
        />
      </View>

      <View style={styles.recommendationCard}>
        <Text style={styles.cardTitle}>System Recommendation</Text>
        <Text style={styles.recommendationText}>
          {evaluation?.system_recommendation || "No recommendation available."}
        </Text>
      </View>
    </ScrollView>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={22} color={colors.primaryDark} />
      </View>

      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>

      {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
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

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  metricCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },

  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  metricTitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "900",
  },

  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },

  metricSubtitle: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },

  recommendationCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginTop: 14,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  recommendationText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
});
