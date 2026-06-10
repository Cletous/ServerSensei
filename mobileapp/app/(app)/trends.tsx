import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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

import { getTelemetryHistory } from "../../src/api/client";
import { TelemetryMetricChartCard } from "../../src/components/TelemetryMetricChartCard";
import { colors } from "../../src/theme/colors";
import type { TelemetryHistoryPoint } from "../../src/types/api";
import { formatDateTime } from "../../src/utils/dateTime";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";
const HISTORY_LIMIT = 60;

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadTrends() {
    try {
      const data = await getTelemetryHistory(DEFAULT_DEVICE_ID, HISTORY_LIMIT);

      const sortedData = data
        .slice()
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

      setHistory(sortedData);
    } catch (error) {
      Alert.alert(
        "Trends error",
        "Could not load telemetry history. Check backend, JWT token, and network.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadTrends();
  }

  useEffect(() => {
    loadTrends();

    const intervalId = setInterval(loadTrends, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const latestPoint = history.length > 0 ? history[history.length - 1] : null;
  const oldestPoint = history.length > 0 ? history[0] : null;

  const chartData = useMemo(() => {
    return {
      temperature: history.map((point) => point.temperature),
      humidity: history.map((point) => point.humidity),
      airQuality: history.map((point) => point.air_quality_raw),
      battery: history.map((point) => point.battery_percent),
      load: history.map((point) => point.load_percent),
    };
  }, [history]);

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
        <Text style={styles.loadingText}>Loading telemetry trends...</Text>
      </View>
    );
  }

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
        <Text style={styles.eyebrow}>Analytics</Text>
        <Text style={styles.title}>Telemetry Trends</Text>
        <Text style={styles.subtitle}>
          Separate graphs for each metric make the readings easier to understand
          and better for presentation screenshots.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard
          icon="analytics-outline"
          label="Samples"
          value={String(history.length)}
        />

        <SummaryCard
          icon="time-outline"
          label="Latest"
          value={
            latestPoint?.created_at
              ? formatDateTime(latestPoint.created_at)
              : "N/A"
          }
        />
      </View>

      <View style={styles.rangeCard}>
        <View style={styles.rangeIcon}>
          <Ionicons name="pulse-outline" size={22} color={colors.primaryDark} />
        </View>

        <View style={styles.rangeTextBlock}>
          <Text style={styles.rangeTitle}>Trend window</Text>
          <Text style={styles.rangeText}>
            {oldestPoint?.created_at
              ? formatDateTime(oldestPoint.created_at)
              : "N/A"}{" "}
            to{" "}
            {latestPoint?.created_at
              ? formatDateTime(latestPoint.created_at)
              : "N/A"}
          </Text>
        </View>
      </View>

      <TelemetryMetricChartCard
        title="Temperature"
        subtitle="Server room thermal trend"
        icon="thermometer-outline"
        unit="°C"
        tone="critical"
        decimals={1}
        data={chartData.temperature}
      />

      <TelemetryMetricChartCard
        title="Humidity"
        subtitle="Relative humidity trend"
        icon="water-outline"
        unit="%"
        tone="info"
        decimals={1}
        data={chartData.humidity}
      />

      <TelemetryMetricChartCard
        title="Air Quality"
        subtitle="MQ135 raw sensor readings"
        icon="cloud-outline"
        unit="raw"
        tone="warning"
        decimals={0}
        data={chartData.airQuality}
      />

      <TelemetryMetricChartCard
        title="Battery"
        subtitle="UPS battery simulation level"
        icon="battery-half-outline"
        unit="%"
        tone="success"
        decimals={0}
        data={chartData.battery}
      />

      <TelemetryMetricChartCard
        title="Load"
        subtitle="Active server load percentage"
        icon="speedometer-outline"
        unit="%"
        tone="dark"
        decimals={0}
        data={chartData.load}
      />
    </ScrollView>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={21} color={colors.primaryDark} />
      </View>

      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  summaryLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  summaryValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 5,
  },

  rangeCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rangeIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  rangeTextBlock: {
    flex: 1,
  },

  rangeTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },

  rangeText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },

  explanationCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginTop: 2,
  },

  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  explanationIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  explanationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  explanationText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 12,
  },
});
