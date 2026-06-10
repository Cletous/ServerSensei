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
  "turn_fan_on",
  "turn_fan_off",

  "server_on",
  "server_off",
  "set_relay",
  "restart_server",

  "power_on_critical_a",
  "power_off_critical_a",
  "restart_critical_a",
  "power_on_critical_b",
  "power_off_critical_b",
  "restart_critical_b",
  "power_on_non_critical_a",
  "power_off_non_critical_a",
  "restart_non_critical_a",
  "power_on_non_critical_b",
  "power_off_non_critical_b",
  "restart_non_critical_b",

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

type ServerActionType = "power_on" | "power_off" | "restart";

const SERVER_LABELS: Record<ServerId, string> = {
  non_critical_a: "Non-Critical Server A",
  non_critical_b: "Non-Critical Server B",
  critical_a: "Critical Server A",
  critical_b: "Critical Server B",
};

function isCriticalServer(server: ServerId) {
  return server === "critical_a" || server === "critical_b";
}

function buildServerAction(actionType: ServerActionType, server: ServerId) {
  if (server === "critical_a") {
    if (actionType === "power_on") return "power_on_critical_a";
    if (actionType === "power_off") return "power_off_critical_a";
    return "restart_critical_a";
  }

  if (server === "critical_b") {
    if (actionType === "power_on") return "power_on_critical_b";
    if (actionType === "power_off") return "power_off_critical_b";
    return "restart_critical_b";
  }

  if (server === "non_critical_a") {
    if (actionType === "power_on") return "power_on_non_critical_a";
    if (actionType === "power_off") return "power_off_non_critical_a";
    return "restart_non_critical_a";
  }

  if (actionType === "power_on") return "power_on_non_critical_b";
  if (actionType === "power_off") return "power_off_non_critical_b";
  return "restart_non_critical_b";
}

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

  async function runServerAction(
    server: ServerId,
    actionType: ServerActionType,
  ) {
    const action = buildServerAction(actionType, server);
    const label = SERVER_LABELS[server];

    if (actionType === "power_on") {
      setServerStates((current) => ({
        ...current,
        [server]: true,
      }));
    }

    if (actionType === "power_off") {
      setServerStates((current) => ({
        ...current,
        [server]: false,
      }));
    }

    return sendCommand(action, {
      server,
      server_label: label,
      source: "server_control_center",
    });
  }

  function serverOn(server: ServerId) {
    const label = SERVER_LABELS[server];

    if (isCriticalServer(server)) {
      Alert.alert(
        `Power ON ${label}?`,
        "This is a critical simulated server. Confirm that Manual Mode is active and that powering it ON is intentional.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Power ON",
            onPress: () => runServerAction(server, "power_on"),
          },
        ],
      );

      return;
    }

    return runServerAction(server, "power_on");
  }

  function serverOff(server: ServerId) {
    const label = SERVER_LABELS[server];

    if (isCriticalServer(server)) {
      Alert.alert(
        `Power OFF ${label}?`,
        "This is a critical simulated server. Turning it OFF may represent downtime for an important service. Continue only if this is intentional.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Power OFF",
            style: "destructive",
            onPress: () => runServerAction(server, "power_off"),
          },
        ],
      );

      return;
    }

    return runServerAction(server, "power_off");
  }

  function restartServer(server: ServerId) {
    const label = SERVER_LABELS[server];

    if (isCriticalServer(server)) {
      Alert.alert(
        `Restart ${label}?`,
        "This is a critical simulated server. Restarting it will briefly turn the relay OFF, then back ON. Continue only if this is intentional.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restart",
            style: "destructive",
            onPress: () => runServerAction(server, "restart"),
          },
        ],
      );

      return;
    }

    return runServerAction(server, "restart");
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
    if (on) {
      await sendCommand("turn_fan_on", {
        source: "cooling_control_center",
      });

      return;
    }

    Alert.alert(
      "Turn cooling fan OFF?",
      "Only turn the cooling fan OFF if the room is safe or you are testing the relay. Automatic cooling protection will not control the fan while Manual Mode is active.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Turn Fan OFF",
          style: "destructive",
          onPress: async () => {
            await sendCommand("turn_fan_off", {
              source: "cooling_control_center",
            });
          },
        },
      ],
    );
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
        <Text style={styles.eyebrow}>Operations Center</Text>
        <Text style={styles.title}>Control Console</Text>
        <Text style={styles.subtitle}>
          Direct hardware controls are grouped by operational area. Manual Mode
          is required for fan, relay, server, and load commands.
        </Text>
      </View>

      <View style={styles.operationMap}>
        <OperationMapItem icon="options-outline" label="Mode" />
        <OperationMapItem icon="snow-outline" label="Cooling" />
        <OperationMapItem icon="server-outline" label="Servers" />
        <OperationMapItem icon="battery-half-outline" label="Battery" />
        <OperationMapItem icon="speedometer-outline" label="Load" />
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

        <View
          style={[
            styles.toggleRow,
            {
              borderColor:
                currentMode === "manual" ? colors.primary : colors.border,
              backgroundColor:
                currentMode === "manual"
                  ? colors.primarySoft
                  : colors.background,
            },
          ]}
        >
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
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.cardTitle}>Cooling Control Center</Text>
            <Text style={styles.muted}>
              Control the cooling fan relay from the app. Manual Mode is
              required. In Automatic Mode, the ESP32 manages cooling from
              temperature and environmental risk.
            </Text>
          </View>

          <View style={styles.iconBadge}>
            <Ionicons
              name="snow-outline"
              size={22}
              color={colors.primaryDark}
            />
          </View>
        </View>

        <View style={styles.commandGrid}>
          <CommandButton
            label="Turn Cooling ON"
            disabled={sendingCommand}
            onPress={() => setFan(true)}
          />

          <CommandButton
            label="Turn Cooling OFF"
            disabled={sendingCommand}
            danger
            onPress={() => setFan(false)}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.cardTitle}>Infrastructure Control Center</Text>
            <Text style={styles.muted}>
              Control simulated server relays individually. Critical server
              actions require stronger confirmation. Non-admin users create
              approval requests before commands can reach the controller.
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
          critical={false}
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />

        <ServerControlRow
          title="Non-Critical Server B"
          serverId="non_critical_b"
          isOn={serverStates.non_critical_b}
          disabled={sendingCommand || loadingState}
          critical={false}
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />

        <ServerControlRow
          title="Critical Server A"
          serverId="critical_a"
          isOn={serverStates.critical_a}
          disabled={sendingCommand || loadingState}
          critical
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />

        <ServerControlRow
          title="Critical Server B"
          serverId="critical_b"
          isOn={serverStates.critical_b}
          disabled={sendingCommand || loadingState}
          critical
          onServerOn={serverOn}
          onServerOff={serverOff}
          onRestartServer={restartServer}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.cardTitle}>Load Management</Text>
            <Text style={styles.muted}>
              Choose the simulated load-shedding state for the server room.
              These commands require Manual Mode.
            </Text>
          </View>

          <View style={styles.iconBadge}>
            <Ionicons
              name="speedometer-outline"
              size={22}
              color={colors.primaryDark}
            />
          </View>
        </View>

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
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.cardTitle}>Power Simulation</Text>
            <Text style={styles.muted}>Power-aware load view.</Text>
          </View>

          <View style={styles.iconBadge}>
            <Ionicons
              name="battery-half-outline"
              size={22}
              color={colors.primaryDark}
            />
          </View>
        </View>

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

function OperationMapItem({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.operationMapItem}>
      <View style={styles.operationMapIcon}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <Text style={styles.operationMapLabel}>{label}</Text>
    </View>
  );
}

function ServerControlRow({
  title,
  serverId,
  isOn,
  disabled,
  critical = false,
  onServerOn,
  onServerOff,
  onRestartServer,
}: {
  title: string;
  serverId: ServerId;
  isOn: boolean;
  disabled?: boolean;
  critical?: boolean;
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
            <View style={styles.serverTitleMetaRow}>
              <Text style={styles.serverControlTitle}>{title}</Text>

              {critical ? (
                <View style={styles.criticalBadge}>
                  <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                </View>
              ) : (
                <View style={styles.nonCriticalBadge}>
                  <Text style={styles.nonCriticalBadgeText}>NON-CRITICAL</Text>
                </View>
              )}
            </View>
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
    backgroundColor: colors.background,
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
    paddingHorizontal: 18,
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

  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.secondary,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },

  muted: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 12,
  },
  commandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  commandButton: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
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
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.background,
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
    borderRadius: 20,
    borderWidth: 1,
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
  serverTitleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  criticalBadge: {
    backgroundColor: "#FEF2F2",
    borderColor: colors.critical,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  criticalBadgeText: {
    color: colors.critical,
    fontSize: 10,
    fontWeight: "900",
  },

  nonCriticalBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  nonCriticalBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
  },
  operationMap: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  operationMapItem: {
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 7,
  },

  operationMapIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  operationMapLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
});
