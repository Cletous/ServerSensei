import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { createCommand } from "../../src/api/client";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

export default function CommandsScreen() {
  const [sendingCommand, setSendingCommand] = useState(false);

  async function sendCommand(
    action: string,
    payload?: Record<string, unknown>,
  ) {
    try {
      setSendingCommand(true);

      await createCommand({
        device_id: DEFAULT_DEVICE_ID,
        action,
        payload,
      });

      Alert.alert(
        "Command queued",
        "The command has been sent to the backend. The ESP32 will execute it on its next command poll.",
      );
    } catch (error) {
      Alert.alert(
        "Command failed",
        "Could not send command. Check your login, backend, user role, and device registration.",
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Remote Commands</Text>
        <Text style={styles.subtitle}>
          Queue commands for the ESP32 through the backend.
        </Text>
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
});
