import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { createCommand } from "../../src/api/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme/colors";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

const MANUAL_ONLY_COMMANDS = [
  "fan_on",
  "fan_off",
  "set_fan",
  "server_on",
  "server_off",
  "set_relay",
  "set_load_state",
  "normal",
  "low_runtime",
  "critical_runtime",
  "safe",
  "all_off",
];

export default function CommandsScreen() {
  const insets = useSafeAreaInsets();
  const [sendingCommand, setSendingCommand] = useState(false);

  async function sendCommand(
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    try {
      setSendingCommand(true);

      const response = await createCommand({
        device_id: DEFAULT_DEVICE_ID,
        action,
        payload,
      });

      if (response.status === "awaiting_approval") {
        Alert.alert(
          "Approval Requested",
          "This command has been sent to the admin approval inbox.",
        );
      } else {
        Alert.alert(
          "Command Queued",
          "The command has been queued for the ESP32.",
        );
      }
    } catch (error: any) {
      const backendMessage = error?.response?.data?.detail;

      if (
        typeof backendMessage === "string" &&
        backendMessage.includes("requires manual mode")
      ) {
        Alert.alert(
          "Manual Mode Required",
          "This command directly controls hardware. Switch the device to Manual Mode before using fan, relay, server, or load controls.",
        );

        return;
      }

      Alert.alert(
        "Command failed",
        backendMessage || "Could not send command.",
      );
    } finally {
      setSendingCommand(false);
    }
  }

  async function setDeviceMode(mode: string) {
    await sendCommand("set_mode", { mode });
  }

  async function setLoadState(state: string) {
    await sendCommand("set_load_state", { state });
  }

  async function setBatteryPercent(batteryPercent: number) {
    await sendCommand("set_battery_percent", {
      battery_percent: batteryPercent,
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 90,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Remote Commands</Text>
        <Text style={styles.subtitle}>
          Queue commands for the ESP32 through the backend.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryCommandButton}
        onPress={() => sendCommand("set_mode", { mode: "manual" })}
      >
        <Ionicons name="construct-outline" size={20} color={colors.white} />
        <Text style={styles.primaryCommandButtonText}>
          Switch to Manual Mode
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryCommandButton}
        onPress={() => sendCommand("set_mode", { mode: "monitor" })}
      >
        <Ionicons name="sync-outline" size={20} color={colors.primary} />
        <Text style={styles.secondaryCommandButtonText}>
          Return to Automatic Mode
        </Text>
      </TouchableOpacity>

      <View style={styles.manualModeNotice}>
        <View style={styles.manualModeIconWrap}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={colors.primary}
          />
        </View>

        <View style={styles.manualModeNoticeTextWrap}>
          <Text style={styles.manualModeNoticeTitle}>
            Manual Mode Protection
          </Text>
          <Text style={styles.manualModeNoticeText}>
            Direct fan, relay, server, and load controls require Manual Mode.
            Automatic mode keeps the ESP32 in charge of safety decisions.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Mode</Text>
        <Text style={styles.muted}>
          Use Manual or Automatic before testing load-state commands.
        </Text>

        <View style={styles.commandGrid}>
          <CommandButton
            label="Monitor"
            disabled={sendingCommand}
            onPress={() => setDeviceMode("monitor")}
          />
          <CommandButton
            label="Manual"
            disabled={sendingCommand}
            onPress={() => setDeviceMode("manual")}
          />
          <CommandButton
            label="Automatic"
            disabled={sendingCommand}
            onPress={() => setDeviceMode("automatic")}
          />
          <CommandButton
            label="Safe"
            disabled={sendingCommand}
            onPress={() => setDeviceMode("safe")}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Load State</Text>
        <Text style={styles.muted}>
          Load commands are rejected by firmware when the device is in monitor
          mode.
        </Text>

        <View style={styles.commandGrid}>
          <CommandButton
            label="Normal"
            disabled={sendingCommand}
            onPress={() => setLoadState("normal")}
          />
          <CommandButton
            label="Low Runtime"
            disabled={sendingCommand}
            onPress={() => setLoadState("low_runtime")}
          />
          <CommandButton
            label="Critical"
            disabled={sendingCommand}
            onPress={() => setLoadState("critical_runtime")}
          />
          <CommandButton
            label="Safe Load"
            disabled={sendingCommand}
            onPress={() => setLoadState("safe")}
          />
          <CommandButton
            label="All Off"
            disabled={sendingCommand}
            onPress={() => setLoadState("all_off")}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Battery Simulation</Text>
        <Text style={styles.muted}>
          These are useful during demonstrations and runtime-drain testing.
        </Text>

        <View style={styles.commandGrid}>
          <CommandButton
            label="Battery 100%"
            disabled={sendingCommand}
            onPress={() => setBatteryPercent(100)}
          />
          <CommandButton
            label="Battery 50%"
            disabled={sendingCommand}
            onPress={() => setBatteryPercent(50)}
          />
          <CommandButton
            label="Battery 20%"
            disabled={sendingCommand}
            onPress={() => setBatteryPercent(20)}
          />
        </View>
      </View>

      {sendingCommand ? (
        <View style={styles.sendingBox}>
          <ActivityIndicator />
          <Text style={styles.sendingText}>Sending command...</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function CommandButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.commandButton, disabled && styles.commandButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.commandButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6b7280",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  muted: {
    color: "#6b7280",
    marginBottom: 12,
  },
  commandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  commandButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  commandButtonDisabled: {
    opacity: 0.6,
  },
  commandButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  sendingBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  sendingText: {
    color: "#374151",
    fontWeight: "700",
  },
  manualModeNotice: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
  },
  manualModeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  manualModeNoticeTextWrap: {
    flex: 1,
  },
  manualModeNoticeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  manualModeNoticeText: {
    marginTop: 4,
    color: colors.mutedText,
    fontWeight: "700",
    lineHeight: 20,
  },
  primaryCommandButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryCommandButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryCommandButton: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryCommandButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900",
  },
});
