import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { colors } from "../theme/colors";
import type { TelemetryHistoryPoint } from "../types/api";

type MetricKey =
  | "temperature"
  | "humidity"
  | "air_quality_raw"
  | "battery_percent"
  | "load_percent";

type MetricConfig = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  color: string;
  max: number;
  unit: string;
};

type NormalizedPoint = {
  x: number;
  y: number;
  rawValue: number;
};

type Series = MetricConfig & {
  points: NormalizedPoint[];
  latestValue: number | null;
};

type MultiLineTelemetryChartProps = {
  data: TelemetryHistoryPoint[];
};

const CHART_WIDTH = 340;
const CHART_HEIGHT = 220;
const CHART_PADDING_LEFT = 38;
const CHART_PADDING_RIGHT = 14;
const CHART_PADDING_TOP = 18;
const CHART_PADDING_BOTTOM = 34;

const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

const METRICS: MetricConfig[] = [
  {
    key: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    color: colors.critical,
    max: 50,
    unit: "°C",
  },
  {
    key: "humidity",
    label: "Humidity",
    shortLabel: "Hum",
    color: colors.info,
    max: 100,
    unit: "%",
  },
  {
    key: "air_quality_raw",
    label: "Air Quality",
    shortLabel: "Air",
    color: colors.warning,
    max: 2000,
    unit: "",
  },
  {
    key: "battery_percent",
    label: "Battery",
    shortLabel: "Batt",
    color: colors.success,
    max: 100,
    unit: "%",
  },
  {
    key: "load_percent",
    label: "Load",
    shortLabel: "Load",
    color: colors.secondary,
    max: 100,
    unit: "%",
  },
];

export function MultiLineTelemetryChart({
  data,
}: MultiLineTelemetryChartProps) {
  const cleanData = data.filter((point) => point.created_at);

  const series = METRICS.map((metric) => buildSeries(metric, cleanData)).filter(
    (item) => item.points.length >= 2,
  );

  const latestPoint =
    cleanData.length > 0 ? cleanData[cleanData.length - 1] : null;

  if (cleanData.length < 2 || series.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Telemetry Trends</Text>
            <Text style={styles.title}>Combined Live Graph</Text>
          </View>
        </View>

        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Waiting for more telemetry</Text>
          <Text style={styles.emptyText}>
            Keep the ESP32 running until at least two telemetry readings are
            stored by the backend.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Telemetry Trends</Text>
          <Text style={styles.title}>Combined Live Graph</Text>
          <Text style={styles.subtitle}>
            All metrics are normalized to 0–100% so they can be compared in one
            graph.
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeValue}>{cleanData.length}</Text>
          <Text style={styles.badgeLabel}>points</Text>
        </View>
      </View>

      <View style={styles.chartFrame}>
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <Rect
            x={CHART_PADDING_LEFT}
            y={CHART_PADDING_TOP}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            rx={14}
            fill="#F8FAFC"
            stroke={colors.border}
            strokeWidth={1}
          />

          {[0, 25, 50, 75, 100].map((tick) => {
            const y =
              CHART_PADDING_TOP + PLOT_HEIGHT - (tick / 100) * PLOT_HEIGHT;

            return (
              <Line
                key={`grid-${tick}`}
                x1={CHART_PADDING_LEFT}
                x2={CHART_WIDTH - CHART_PADDING_RIGHT}
                y1={y}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
              />
            );
          })}

          {[0, 50, 100].map((tick) => {
            const y =
              CHART_PADDING_TOP + PLOT_HEIGHT - (tick / 100) * PLOT_HEIGHT;

            return (
              <SvgText
                key={`label-${tick}`}
                x={CHART_PADDING_LEFT - 9}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fill={colors.mutedText}
              >
                {tick}
              </SvgText>
            );
          })}

          {series.map((item) => (
            <Path
              key={item.key}
              d={buildPath(item.points)}
              fill="none"
              stroke={item.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {series.map((item) => {
            const lastPoint = item.points[item.points.length - 1];

            return (
              <Circle
                key={`${item.key}-latest`}
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={4}
                fill={item.color}
                stroke={colors.white}
                strokeWidth={2}
              />
            );
          })}

          <SvgText
            x={CHART_PADDING_LEFT}
            y={CHART_HEIGHT - 8}
            fontSize="10"
            fontWeight="700"
            fill={colors.mutedText}
          >
            oldest
          </SvgText>

          <SvgText
            x={CHART_WIDTH - CHART_PADDING_RIGHT}
            y={CHART_HEIGHT - 8}
            textAnchor="end"
            fontSize="10"
            fontWeight="700"
            fill={colors.mutedText}
          >
            latest
          </SvgText>
        </Svg>
      </View>

      <View style={styles.legend}>
        {series.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: item.color,
                },
              ]}
            />
            <Text style={styles.legendText}>{item.shortLabel}</Text>
          </View>
        ))}
      </View>

      <View style={styles.latestGrid}>
        {METRICS.map((metric) => {
          const value = latestPoint?.[metric.key];

          return (
            <View key={metric.key} style={styles.latestCard}>
              <Text style={styles.latestLabel}>{metric.shortLabel}</Text>
              <Text style={styles.latestValue}>
                {typeof value === "number"
                  ? formatValue(value, metric.unit)
                  : "N/A"}
              </Text>
              <Text style={styles.latestMeta}>
                normalized against {metric.max}
                {metric.unit}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function buildSeries(
  metric: MetricConfig,
  data: TelemetryHistoryPoint[],
): Series {
  const points = data
    .map((point, index) => {
      const value = point[metric.key];

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }

      const x =
        data.length <= 1
          ? CHART_PADDING_LEFT
          : CHART_PADDING_LEFT + (index / (data.length - 1)) * PLOT_WIDTH;

      const normalized = normalizeValue(value, metric.max);

      const y =
        CHART_PADDING_TOP + PLOT_HEIGHT - (normalized / 100) * PLOT_HEIGHT;

      return {
        x,
        y,
        rawValue: value,
      };
    })
    .filter((point): point is NormalizedPoint => point !== null);

  const latestValue =
    points.length > 0 ? points[points.length - 1].rawValue : null;

  return {
    ...metric,
    points,
    latestValue,
  };
}

function normalizeValue(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function buildPath(points: NormalizedPoint[]) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function formatValue(value: number, unit: string) {
  if (unit === "") {
    return value.toFixed(0);
  }

  return `${value.toFixed(1)}${unit}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    shadowColor: colors.secondary,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 14,
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
    fontSize: 21,
    fontWeight: "900",
    marginTop: 5,
  },

  subtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 5,
    maxWidth: 235,
  },

  badge: {
    minWidth: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeValue: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900",
  },

  badgeLabel: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  chartFrame: {
    overflow: "hidden",
    borderRadius: 18,
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },

  legendText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
  },

  latestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },

  latestCard: {
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },

  latestLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  latestValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 5,
  },

  latestMeta: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 4,
  },

  emptyBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6,
  },
});
