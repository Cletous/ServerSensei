import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../src/theme/colors";

export default function MonitorScreen() {
  const insets = useSafeAreaInsets();

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
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Monitoring Center</Text>
        <Text style={styles.title}>Live System Monitoring</Text>
        <Text style={styles.subtitle}>
          Open focused monitoring views instead of crowding the main dashboard.
        </Text>
      </View>

      <View style={styles.grid}>
        <NavigationCard
          icon="thermometer-outline"
          title="Environment"
          description="Temperature, humidity, air quality, cooling state, and environmental risk."
          onPress={() => router.push("/environment")}
        />

        <NavigationCard
          icon="flash-outline"
          title="Power"
          description="Power source, UPS battery, load percentage, and estimated remaining runtime."
          onPress={() => router.push("/power")}
        />

        <NavigationCard
          icon="analytics-outline"
          title="Trends"
          description="Individual telemetry graphs for temperature, humidity, air quality, battery, and load."
          onPress={() => router.push("/trends")}
        />

        <NavigationCard
          icon="server-outline"
          title="Digital Twin"
          description="Visual server room model showing power, UPS, cooling, load, and server relay states."
          onPress={() => router.push("/digital-twin")}
        />
      </View>
    </ScrollView>
  );
}

function NavigationCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={24} color={colors.primaryDark} />
      </View>

      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={20}
        color={colors.mutedText}
      />
    </Pressable>
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
    fontSize: 28,
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

  grid: {
    gap: 14,
  },

  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: colors.secondary,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  cardText: {
    flex: 1,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  cardDescription: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
});
