import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { colors } from "../theme/colors";

type TelemetryMetricChartCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  unit: string;
  data: Array<number | null | undefined>;
  tone?: "success" | "warning" | "critical" | "info" | "dark";
  decimals?: number;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 135;
const PADDING = 18;

const PLOT_WIDTH = CHART_WIDTH - PADDING * 2;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING * 2;

export function TelemetryMetricChartCard({
  title,
  subtitle,
  icon,
  unit,
  data,
  tone = "info",
  decimals = 1,
}: TelemetryMetricChartCardProps) {
  const cleanData = data.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  const latestValue =
    cleanData.length > 0 ? cleanData[cleanData.length - 1] : null;

  const minValue = cleanData.length > 0 ? Math.min(...cleanData) : null;
  const maxValue = cleanData.length > 0 ? Math.max(...cleanData) : null;
  const averageValue =
    cleanData.length > 0
      ? cleanData.reduce((sum, value) => sum + value, 0) / cleanData.length
      : null;

  const lineColor = getToneColor(tone);
  const path = buildLinePath(cleanData);
  const areaPath = buildAreaPath(cleanData);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: softenColor(lineColor),
              },
            ]}
          >
            <Ionicons name={icon} size={22} color={lineColor} />
          </View>

          <View style={styles.titleTextBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.latestBox}>
          <Text style={styles.latestLabel}>Latest</Text>
          <Text style={styles.latestValue}>
            {formatValue(latestValue, unit, decimals)}
          </Text>
        </View>
      </View>

      {cleanData.length < 2 ? (
        <View style={styles.emptyGraph}>
          <Text style={styles.emptyTitle}>Waiting for trend data</Text>
          <Text style={styles.emptyText}>
            At least two telemetry samples are needed to draw this graph.
          </Text>
        </View>
      ) : (
        <View style={styles.chartShell}>
          <Svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <Rect
              x={0}
              y={0}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              rx={22}
              fill="#F8FAFC"
            />

            <Defs>
              <LinearGradient
                id={`gradient-${title.replace(/\s+/g, "-").toLowerCase()}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0" stopColor={lineColor} stopOpacity="0.18" />
                <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>

            {[0.25, 0.5, 0.75].map((ratio) => {
              const y = PADDING + PLOT_HEIGHT * ratio;

              return (
                <Path
                  key={`grid-${ratio}`}
                  d={`M ${PADDING} ${y} L ${CHART_WIDTH - PADDING} ${y}`}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray="5 7"
                />
              );
            })}

            <Path
              d={areaPath}
              fill={`url(#gradient-${title.replace(/\s+/g, "-").toLowerCase()})`}
            />

            <Path
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {cleanData.map((value, index) => {
              if (
                index !== 0 &&
                index !== cleanData.length - 1 &&
                index % Math.ceil(cleanData.length / 4) !== 0
              ) {
                return null;
              }

              const point = valueToPoint(value, index, cleanData);

              return (
                <Circle
                  key={`point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={3.8}
                  fill={lineColor}
                  stroke={colors.white}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>
        </View>
      )}

      <View style={styles.statsRow}>
        <MetricStat label="Min" value={formatValue(minValue, unit, decimals)} />
        <MetricStat
          label="Avg"
          value={formatValue(averageValue, unit, decimals)}
        />
        <MetricStat label="Max" value={formatValue(maxValue, unit, decimals)} />
      </View>
    </View>
  );
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function buildLinePath(values: number[]) {
  if (values.length === 0) {
    return "";
  }

  return values
    .map((value, index) => {
      const point = valueToPoint(value, index, values);
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(values: number[]) {
  if (values.length === 0) {
    return "";
  }

  const linePath = buildLinePath(values);
  const lastPoint = valueToPoint(
    values[values.length - 1],
    values.length - 1,
    values,
  );
  const firstPoint = valueToPoint(values[0], 0, values);
  const baseY = CHART_HEIGHT - PADDING;

  return `${linePath} L ${lastPoint.x.toFixed(2)} ${baseY} L ${firstPoint.x.toFixed(
    2,
  )} ${baseY} Z`;
}

function valueToPoint(value: number, index: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  const x =
    values.length <= 1
      ? PADDING
      : PADDING + (index / (values.length - 1)) * PLOT_WIDTH;

  const normalized = max === min ? 0.5 : (value - min) / (max - min);
  const y = PADDING + PLOT_HEIGHT - normalized * PLOT_HEIGHT;

  return {
    x,
    y,
  };
}

function formatValue(
  value: number | null | undefined,
  unit: string,
  decimals: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  if (unit === "raw") {
    return `${value.toFixed(0)} raw`;
  }

  return `${value.toFixed(decimals)}${unit}`;
}

function getToneColor(tone: TelemetryMetricChartCardProps["tone"]) {
  if (tone === "success") {
    return colors.success;
  }

  if (tone === "warning") {
    return colors.warning;
  }

  if (tone === "critical") {
    return colors.critical;
  }

  if (tone === "dark") {
    return colors.secondary;
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

  if (color === colors.secondary) {
    return "#E2E8F0";
  }

  return "#DBEAFE";
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.secondary,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  titleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  titleTextBlock: {
    flex: 1,
  },

  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },

  subtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },

  latestBox: {
    minWidth: 86,
    alignItems: "flex-end",
  },

  latestLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  latestValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 5,
  },

  chartShell: {
    overflow: "hidden",
    borderRadius: 22,
  },

  emptyGraph: {
    minHeight: CHART_HEIGHT,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    justifyContent: "center",
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },

  emptyText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },

  statLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  statValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },
});
