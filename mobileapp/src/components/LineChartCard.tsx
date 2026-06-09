import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { colors } from "../theme/colors";

type LineChartCardProps = {
  title: string;
  valueLabel: string;
  unit?: string;
  data: number[];
  minLabel?: string;
  maxLabel?: string;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const CHART_PADDING = 14;

export function LineChartCard({
  title,
  valueLabel,
  unit = "",
  data,
  minLabel,
  maxLabel,
}: LineChartCardProps) {
  const cleanData = data.filter((value) => Number.isFinite(value));

  const latestValue =
    cleanData.length > 0 ? cleanData[cleanData.length - 1] : null;

  const minValue = cleanData.length > 0 ? Math.min(...cleanData) : 0;
  const maxValue = cleanData.length > 0 ? Math.max(...cleanData) : 0;

  const path = buildPath(cleanData, minValue, maxValue);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{valueLabel}</Text>
        </View>

        <View style={styles.valueBadge}>
          <Text style={styles.valueText}>
            {latestValue === null ? "--" : latestValue.toFixed(1)}
            {unit}
          </Text>
        </View>
      </View>

      {cleanData.length < 2 ? (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Waiting for more data...</Text>
        </View>
      ) : (
        <View style={styles.chartWrap}>
          <Svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <Defs>
              <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop
                  offset="0"
                  stopColor={colors.primary}
                  stopOpacity="0.75"
                />
                <Stop
                  offset="1"
                  stopColor={colors.primaryDark}
                  stopOpacity="1"
                />
              </LinearGradient>
            </Defs>

            <Path
              d={path}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {cleanData.map((value, index) => {
              const point = getPoint(
                value,
                index,
                cleanData.length,
                minValue,
                maxValue,
              );

              if (index !== cleanData.length - 1) {
                return null;
              }

              return (
                <Circle
                  key={`${title}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  fill={colors.primary}
                />
              );
            })}
          </Svg>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Min: {minLabel || formatValue(minValue, unit)}
        </Text>
        <Text style={styles.footerText}>
          Max: {maxLabel || formatValue(maxValue, unit)}
        </Text>
      </View>
    </View>
  );
}

function buildPath(data: number[], minValue: number, maxValue: number): string {
  if (data.length < 2) {
    return "";
  }

  return data
    .map((value, index) => {
      const point = getPoint(value, index, data.length, minValue, maxValue);
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function getPoint(
  value: number,
  index: number,
  length: number,
  minValue: number,
  maxValue: number,
) {
  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const x = CHART_PADDING + (index / Math.max(length - 1, 1)) * usableWidth;

  const range = maxValue - minValue;
  const normalized = range === 0 ? 0.5 : (value - minValue) / range;

  const y = CHART_PADDING + (1 - normalized) * usableHeight;

  return { x, y };
}

function formatValue(value: number, unit: string): string {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${value.toFixed(1)}${unit}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
    marginTop: 2,
    fontSize: 13,
  },
  valueBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  valueText: {
    color: colors.primaryDark,
    fontWeight: "900",
  },
  chartWrap: {
    height: CHART_HEIGHT,
  },
  emptyChart: {
    height: CHART_HEIGHT,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  footerText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
});
