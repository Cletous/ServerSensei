import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { colors } from "../theme/colors";
import type { TelemetryHistoryPoint } from "../types/api";
import { formatDateTime } from "../utils/dateTime";

type MetricKey =
  | "temperature"
  | "humidity"
  | "air_quality_raw"
  | "load_percent";

type MetricConfig = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  color: string;
  unit: string;
  decimals: number;
};

type PlotPoint = {
  x: number;
  y: number;
  value: number;
  sourceIndex: number;
};

type Series = MetricConfig & {
  points: PlotPoint[];
};

type MultiLineTelemetryChartProps = {
  data: TelemetryHistoryPoint[];
};

const CHART_WIDTH = 340;
const CHART_HEIGHT = 250;

const PADDING_LEFT = 18;
const PADDING_RIGHT = 18;
const PADDING_TOP = 22;
const PADDING_BOTTOM = 34;

const PLOT_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const METRICS: MetricConfig[] = [
  {
    key: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    color: colors.critical,
    unit: "°C",
    decimals: 1,
  },
  {
    key: "humidity",
    label: "Humidity",
    shortLabel: "Humidity",
    color: colors.info,
    unit: "%",
    decimals: 1,
  },
  {
    key: "air_quality_raw",
    label: "Air Quality",
    shortLabel: "Air",
    color: colors.warning,
    unit: "raw",
    decimals: 0,
  },
  {
    key: "load_percent",
    label: "Load",
    shortLabel: "Load",
    color: colors.secondary,
    unit: "%",
    decimals: 0,
  },
];

export function MultiLineTelemetryChart({
  data,
}: MultiLineTelemetryChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const cleanData = useMemo(
    () =>
      data
        .filter((point) => point.created_at)
        .slice()
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [data],
  );

  const series = useMemo(
    () =>
      METRICS.map((metric) => buildSeries(metric, cleanData)).filter(
        (item) => item.points.length >= 2,
      ),
    [cleanData],
  );

  const activeIndex =
    selectedIndex ?? (cleanData.length > 0 ? cleanData.length - 1 : null);

  const activePoint =
    activeIndex == null ? null : (cleanData[activeIndex] ?? null);

  if (cleanData.length < 2 || series.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Telemetry Trends</Text>
            <Text style={styles.title}>Live Inspection Graph</Text>
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

  function inspectAtX(locationX: number) {
    const clampedX = Math.max(
      PADDING_LEFT,
      Math.min(CHART_WIDTH - PADDING_RIGHT, locationX),
    );
    const ratio = (clampedX - PADDING_LEFT) / PLOT_WIDTH;
    const index = Math.round(ratio * (cleanData.length - 1));
    const safeIndex = Math.max(0, Math.min(cleanData.length - 1, index));

    setSelectedIndex(safeIndex);
  }

  const webHoverHandlers =
    Platform.OS === "web"
      ? ({
          onMouseMove: (event: any) => {
            const offsetX =
              event?.nativeEvent?.offsetX ?? event?.nativeEvent?.locationX ?? 0;

            inspectAtX(offsetX);
          },
          onMouseLeave: () => {
            setSelectedIndex(null);
          },
        } as any)
      : {};

  const activeX =
    activeIndex == null
      ? PADDING_LEFT
      : PADDING_LEFT + (activeIndex / (cleanData.length - 1)) * PLOT_WIDTH;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Telemetry Trends</Text>
          <Text style={styles.title}>Live Inspection Graph</Text>
          <Text style={styles.subtitle}>
            Hover or drag across the chart to inspect each telemetry sample.
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeValue}>10s</Text>
          <Text style={styles.badgeLabel}>interval</Text>
        </View>
      </View>

      <View
        style={styles.chartFrame}
        {...webHoverHandlers}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          inspectAtX(event.nativeEvent.locationX);
        }}
        onResponderMove={(event) => {
          inspectAtX(event.nativeEvent.locationX);
        }}
      >
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <Rect
            x={PADDING_LEFT}
            y={PADDING_TOP}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            rx={18}
            fill="#F8FAFC"
            stroke={colors.border}
            strokeWidth={1}
          />

          {[0.25, 0.5, 0.75].map((ratio) => {
            const y = PADDING_TOP + PLOT_HEIGHT * ratio;

            return (
              <Line
                key={`grid-${ratio}`}
                x1={PADDING_LEFT}
                x2={CHART_WIDTH - PADDING_RIGHT}
                y1={y}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="5 6"
              />
            );
          })}

          {buildTimeTickIndexes(cleanData.length).map((index) => {
            const x =
              PADDING_LEFT + (index / (cleanData.length - 1)) * PLOT_WIDTH;

            return (
              <Line
                key={`tick-${index}`}
                x1={x}
                x2={x}
                y1={PADDING_TOP}
                y2={CHART_HEIGHT - PADDING_BOTTOM}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4 8"
              />
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

          <Line
            x1={activeX}
            x2={activeX}
            y1={PADDING_TOP}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            stroke={colors.secondary}
            strokeWidth={1.5}
            strokeDasharray="5 5"
          />

          {series.map((item) => {
            const activeSeriesPoint = item.points.find(
              (point) => point.sourceIndex === activeIndex,
            );

            if (!activeSeriesPoint) {
              return null;
            }

            return (
              <Circle
                key={`${item.key}-active`}
                cx={activeSeriesPoint.x}
                cy={activeSeriesPoint.y}
                r={4.5}
                fill={item.color}
                stroke={colors.white}
                strokeWidth={2}
              />
            );
          })}
        </Svg>

        {activePoint ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              activeX > CHART_WIDTH * 0.58
                ? styles.tooltipLeft
                : styles.tooltipRight,
            ]}
          >
            <Text style={styles.tooltipTitle}>
              {formatDateTime(activePoint.created_at)}
            </Text>

            <TooltipValue
              color={colors.critical}
              label="Temperature"
              value={formatMetricValue(activePoint.temperature, "°C", 1)}
            />

            <TooltipValue
              color={colors.info}
              label="Humidity"
              value={formatMetricValue(activePoint.humidity, "%", 1)}
            />

            <TooltipValue
              color={colors.warning}
              label="Air quality"
              value={formatMetricValue(activePoint.air_quality_raw, "raw", 0)}
            />

            <TooltipValue
              color={colors.secondary}
              label="Load"
              value={formatMetricValue(activePoint.load_percent, "%", 0)}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        {METRICS.map((metric) => (
          <View key={metric.key} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: metric.color,
                },
              ]}
            />
            <Text style={styles.legendText}>{metric.shortLabel}</Text>
          </View>
        ))}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Graph behaviour</Text>
        <Text style={styles.noteText}>
          The Y-axis is intentionally unlabeled because each line keeps its real
          unit. Use hover or touch inspection to read the exact values.
        </Text>
      </View>
    </View>
  );
}

function TooltipValue({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.tooltipRow}>
      <View
        style={[
          styles.tooltipDot,
          {
            backgroundColor: color,
          },
        ]}
      />
      <Text style={styles.tooltipLabel}>{label}</Text>
      <Text style={styles.tooltipValue}>{value}</Text>
    </View>
  );
}

function buildSeries(
  metric: MetricConfig,
  data: TelemetryHistoryPoint[],
): Series {
  const values = data
    .map((point) => point[metric.key])
    .filter((value): value is number => {
      return typeof value === "number" && Number.isFinite(value);
    });

  const min = Math.min(...values);
  const max = Math.max(...values);

  const points = data
    .map((point, index) => {
      const value = point[metric.key];

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }

      const x =
        data.length <= 1
          ? PADDING_LEFT
          : PADDING_LEFT + (index / (data.length - 1)) * PLOT_WIDTH;

      const normalized = normalizeWithinMetric(value, min, max);

      const y = PADDING_TOP + PLOT_HEIGHT - normalized * PLOT_HEIGHT;

      return {
        x,
        y,
        value,
        sourceIndex: index,
      };
    })
    .filter((point): point is PlotPoint => point !== null);

  return {
    ...metric,
    points,
  };
}

function normalizeWithinMetric(value: number, min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function buildPath(points: PlotPoint[]) {
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

function buildTimeTickIndexes(length: number) {
  if (length <= 2) {
    return [0, length - 1];
  }

  const middle = Math.floor((length - 1) / 2);
  return [0, middle, length - 1];
}

function formatMetricValue(
  value: number | null | undefined,
  unit: string,
  decimals: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  const formatted = value.toFixed(decimals);

  if (unit === "raw") {
    return `${formatted} raw`;
  }

  return `${formatted}${unit}`;
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
    maxWidth: 230,
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
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: colors.background,
  },

  tooltip: {
    position: "absolute",
    top: 18,
    width: 190,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    shadowColor: colors.secondary,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  tooltipLeft: {
    left: 20,
  },

  tooltipRight: {
    right: 20,
  },

  tooltipTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginBottom: 8,
  },

  tooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
  },

  tooltipDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },

  tooltipLabel: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
  },

  tooltipValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
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

  noteCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
  },

  noteTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },

  noteText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 5,
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
