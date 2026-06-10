import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { createCommand, getDecisionEvaluation } from "../../src/api/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme/colors";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

const MANUAL_ONLY_ACTIONS = new Set([
  "fan_on",
  "fan_off",
  "set_fan",
  "server_on",
  "server_off",
  "set_relay",
  "restart_server",
  "restart_all_servers",
  "power_all_servers",
  "shutdown_all_servers",
  "set_load_state",
  "normal",
  "low_runtime",
  "critical_runtime",
  "safe",
  "all_off",
]);

function isManualOnlyAction(action: string) {
  return MANUAL_ONLY_ACTIONS.has(action);
}

type ServerId =
  | "non_critical_a"
  | "non_critical_b"
  | "critical_a"
  | "critical_b";

export default function CommandsScreen() {
  const insets = useSafeAreaInsets();
  const [sendingCommand, setSendingCommand] = useState(false);

  const [loadingState, setLoadingState] = useState(true);
  const [currentMode, setCurrentMode] = useState<"manual" | "automatic">(
    "automatic",
  );
  const [serverStates, setServerStates] = useState<Record<ServerId, boolean>>({
    non_critical_a: false,
    non_critical_b: false,
    critical_a: false,
    critical_b: false,
  });

  async function sendCommand(
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    if (isManualOnlyAction(action) && currentMode !== "manual") {
      Alert.alert(
        "Switch to Manual Mode first",
        "Automatic mode will override manual actions. Switch the device to Manual Mode before using fan, relay, server, or load controls.",
      );

      return null;
    }

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

      return response;
    } catch (error: any) {
      const backendMessage = error?.response?.data?.detail;

      if (
        typeof backendMessage === "string" &&
        backendMessage.includes("requires manual mode")
      ) {
        Alert.alert(
          "Switch to Manual Mode first",
          "Automatic mode will override manual actions. Switch the device to Manual Mode before using fan, relay, server, or load controls.",
        );

        return null;
      }

      Alert.alert(
        "Command failed",
        backendMessage || "Could not send command.",
      );

      return null;
    } finally {
      setSendingCommand(false);

      setTimeout(() => {
        loadCurrentDeviceState(false);
      }, 1500);
    }
  }

  async function setDeviceMode(mode: "manual" | "automatic") {
    await sendCommand("set_mode", { mode });

    setTimeout(() => {
      loadCurrentDeviceState(false);
    }, 2000);
  }

  async function setLoadState(state: string) {
    await sendCommand("set_load_state", { state });
  }

  function serverOn(server: ServerId) {
    setServerStates((current) => ({
      ...current,
      [server]: true,
    }));

    return sendCommand("server_on", { server });
  }

  function serverOff(server: ServerId) {
    setServerStates((current) => ({
      ...current,
      [server]: false,
    }));

    return sendCommand("server_off", { server });
  }

  function restartServer(server: ServerId) {
    return sendCommand("restart_server", { server });
  }

  function restartAllServers() {
    setServerStates({
      non_critical_a: true,
      non_critical_b: true,
      critical_a: true,
      critical_b: true,
    });

    return sendCommand("restart_all_servers", {});
  }

  function powerAllServers() {
    setServerStates({
      non_critical_a: true,
      non_critical_b: true,
      critical_a: true,
      critical_b: true,
    });

    return sendCommand("power_all_servers", {});
  }

  function shutdownAllServers() {
    setServerStates({
      non_critical_a: false,
      non_critical_b: false,
      critical_a: false,
      critical_b: false,
    });

    return sendCommand("shutdown_all_servers", {});
  }

  async function loadCurrentDeviceState(showLoader = false) {
    try {
      if (showLoader) {
        setLoadingState(true);
      }

      const evaluation = await getDecisionEvaluation(DEFAULT_DEVICE_ID);

      setCurrentMode(evaluation.mode === "manual" ? "manual" : "automatic");

      setServerStates({
        non_critical_a: Boolean(evaluation.non_critical_server_a_on),
        non_critical_b: Boolean(evaluation.non_critical_server_b_on),
        critical_a: Boolean(evaluation.critical_server_a_on),
        critical_b: Boolean(evaluation.critical_server_b_on),
      });
    } catch (error) {
      console.log("Could not load command state", error);
    } finally {
      if (showLoader) {
        setLoadingState(false);
      }
    }
  }

  async function setFan(on: boolean) {
    await sendCommand("set_fan", { on });
  }

  async function setBatteryPercent(batteryPercent: number) {
    await sendCommand("set_battery_percent", {
      battery_percent: batteryPercent,
    });
  }

  useEffect(() => {
    loadCurrentDeviceState(true);

    const intervalId = setInterval(() => {
      loadCurrentDeviceState(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

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

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.cardTitle}>Device Control Mode</Text>
            <Text style={styles.muted}>
              Manual mode enables direct hardware control. Automatic mode lets
              the ESP32 intelligence manage cooling and load response.
            </Text>
          </View>

          <View style={styles.iconBadge}>
            <Ionicons
              name="options-outline"
              size={22}
              color={colors.primaryDark}
            />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>
              {currentMode === "manual" ? "Manual Mode" : "Automatic Mode"}
            </Text>
            <Text style={styles.toggleSubtitle}>
              {currentMode === "manual"
                ? "Direct operator control is active"
                : "Predictive control is active"}
            </Text>
          </View>

          <Switch
            value={currentMode === "manual"}
            disabled={sendingCommand || loadingState}
            onValueChange={(enabled) => {
              const nextMode = enabled ? "manual" : "automatic";
              setDeviceMode(nextMode);
            }}
            trackColor={{
              false: colors.border,
              true: colors.primarySoft,
            }}
            thumbColor={
              currentMode === "manual" ? colors.primaryDark : colors.mutedText
            }
          />
        </View>
      </View>

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
        <Text style={styles.cardTitle}>Cooling Control</Text>
        <Text style={styles.muted}>
          Manual fan commands require Manual Mode. Automatic mode allows the
          ESP32 to control cooling based on temperature and environmental risk.
        </Text>

        <View style={styles.commandGrid}>
          <CommandButton
            label="Fan ON"
            disabled={sendingCommand}
            onPress={() => setFan(true)}
          />
          <CommandButton
            label="Fan OFF"
            disabled={sendingCommand}
            onPress={() => setFan(false)}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.cardTitle}>Server Control Center</Text>
            <Text style={styles.muted}>
              Toggle individual simulated server relays. Load percentage is
              recalculated from servers currently powered ON.
            </Text>
          </View>

          <View style={styles.iconBadge}>
            <Ionicons
              name="server-outline"
              size={22}
              color={colors.primaryDark}
            />
          </View>
        </View>

        <View style={styles.bulkActionRow}>
          <CommandButton
            label="Power All"
            disabled={sendingCommand}
            onPress={powerAllServers}
          />

          <CommandButton
            label="Shutdown All"
            disabled={sendingCommand}
            danger
            onPress={() =>
              Alert.alert(
                "Shutdown all simulated servers?",
                "This will turn OFF all simulated server relays.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Shutdown All",
                    style: "destructive",
                    onPress: shutdownAllServers,
                  },
                ],
              )
            }
          />

          <CommandButton
            label="Restart All"
            disabled={sendingCommand}
            danger
            onPress={() =>
              Alert.alert(
                "Restart all simulated servers?",
                "All simulated server relays will briefly turn OFF, then turn back ON.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Restart All",
                    style: "destructive",
                    onPress: restartAllServers,
                  },
                ],
              )
            }
          />
        </View>

        <ServerControlRow
          title="Non-Critical Server A"
          serverId="non_critical_a"
          isOn={serverStates.non_critical_a}
          disabled={sendingCommand || loadingState}
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />

        <ServerControlRow
          title="Non-Critical Server B"
          serverId="non_critical_b"
          isOn={serverStates.non_critical_b}
          disabled={sendingCommand || loadingState}
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />

        <ServerControlRow
          title="Critical Server A"
          serverId="critical_a"
          isOn={serverStates.critical_a}
          disabled={sendingCommand || loadingState}
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />

        <ServerControlRow
          title="Critical Server B"
          serverId="critical_b"
          isOn={serverStates.critical_b}
          disabled={sendingCommand || loadingState}
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Load State</Text>
        <Text style={styles.muted}>
          Load commands require Manual Mode and are rejected when the ESP32 is
          not in manual control.
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

function ServerControlRow({
  title,
  serverId,
  isOn,
  disabled,
  onServerOn,
  onServerOff,
  onRestartServer,
}: {
  title: string;
  serverId: ServerId;
  isOn: boolean;
  disabled?: boolean;
  onServerOn: (server: ServerId) => void;
  onServerOff: (server: ServerId) => void;
  onRestartServer: (server: ServerId) => void;
}) {
  return (
    <View style={styles.serverControlRow}>
      <View style={styles.serverControlHeader}>
        <View style={styles.serverTitleRow}>
          <Ionicons
            name="hardware-chip-outline"
            size={18}
            color={isOn ? colors.success : colors.mutedText}
          />
          <View>
            <Text style={styles.serverControlTitle}>{title}</Text>
            <Text
              style={[
                styles.serverStatusText,
                isOn ? styles.serverStatusOn : styles.serverStatusOff,
              ]}
            >
              {isOn ? "ON" : "OFF"}
            </Text>
          </View>
        </View>

        <Switch
          value={isOn}
          disabled={disabled}
          onValueChange={(enabled) => {
            if (enabled) {
              onServerOn(serverId);
            } else {
              onServerOff(serverId);
            }
          }}
          trackColor={{
            false: colors.border,
            true: colors.primarySoft,
          }}
          thumbColor={isOn ? colors.success : colors.mutedText}
        />
      </View>

      <CommandButton
        label="Restart"
        disabled={disabled || !isOn}
        onPress={() =>
          Alert.alert(
            `Restart ${title}?`,
            "This simulated server relay will briefly turn OFF, then turn back ON.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Restart",
                onPress: () => onRestartServer(serverId),
              },
            ],
          )
        }
      />
    </View>
  );
}

function CommandButton({
  label,
  onPress,
  disabled,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.commandButton,
        danger && styles.commandButtonDanger,
        disabled && styles.commandButtonDisabled,
        pressed && !disabled && styles.commandButtonPressed,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        style={[
          styles.commandButtonText,
          danger && styles.commandButtonDangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
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
  commandButtonDanger: {
    borderColor: colors.critical,
    backgroundColor: "#FEF2F2",
  },
  commandButtonDangerText: {
    color: colors.critical,
  },
  commandButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  serverControlRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },

  serverControlHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  serverControlTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F9FAFB",
  },

  toggleTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },

  toggleSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  bulkActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },

  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  serverStatusText: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },

  serverStatusOn: {
    color: colors.success,
  },

  serverStatusOff: {
    color: colors.mutedText,
  },
});
