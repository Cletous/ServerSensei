import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import {
  getRuntimeSettings,
  updateRuntimeSettings,
} from "../../src/api/client";
import type { RuntimeSettings } from "../../src/types/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDateTime } from "../../src/utils/dateTime";
import { showError, showInfo } from "../../src/utils/dialogs";

const DEFAULT_DEVICE_ID = "serversensei-esp32-001";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<RuntimeSettings | null>(null);

  const [fanOnTemperature, setFanOnTemperature] = useState("");
  const [fanOffTemperature, setFanOffTemperature] = useState("");

  const [lowRuntimeThresholdMinutes, setLowRuntimeThresholdMinutes] =
    useState("");
  const [criticalRuntimeThresholdMinutes, setCriticalRuntimeThresholdMinutes] =
    useState("");

  const [demoUpsDrainSeconds, setDemoUpsDrainSeconds] = useState("");
  const [batteryRecoveryPercentPerSecond, setBatteryRecoveryPercentPerSecond] =
    useState("");
  const [restartBatteryPercent, setRestartBatteryPercent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    try {
      setLoading(true);

      const data = await getRuntimeSettings(DEFAULT_DEVICE_ID);

      setSettings(data);

      setFanOnTemperature(String(data.fan_on_temperature));
      setFanOffTemperature(String(data.fan_off_temperature));

      setLowRuntimeThresholdMinutes(String(data.low_runtime_threshold_minutes));
      setCriticalRuntimeThresholdMinutes(
        String(data.critical_runtime_threshold_minutes),
      );

      setDemoUpsDrainSeconds(
        String(data.demo_ups_full_drain_seconds_at_100_load),
      );
      setBatteryRecoveryPercentPerSecond(
        String(data.demo_battery_recovery_percent_per_second),
      );
      setRestartBatteryPercent(String(data.demo_restart_battery_percent));
    } catch (error) {
      showError(
        "Settings error",
        "Could not load runtime settings. Check backend, login token, and device registration.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toNumber(value: string): number | null {
    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) {
      return null;
    }

    return parsedValue;
  }

  async function saveSettings() {
    const fanOn = toNumber(fanOnTemperature);
    const fanOff = toNumber(fanOffTemperature);

    const lowRuntime = toNumber(lowRuntimeThresholdMinutes);
    const criticalRuntime = toNumber(criticalRuntimeThresholdMinutes);

    const drainSeconds = toNumber(demoUpsDrainSeconds);
    const recoveryRate = toNumber(batteryRecoveryPercentPerSecond);
    const restartPercent = toNumber(restartBatteryPercent);

    if (
      fanOn === null ||
      fanOff === null ||
      lowRuntime === null ||
      criticalRuntime === null ||
      drainSeconds === null ||
      recoveryRate === null ||
      restartPercent === null
    ) {
      showError("Invalid values", "Please enter numbers only.");
      return;
    }

    if (fanOff >= fanOn) {
      showError(
        "Invalid fan thresholds",
        "Fan OFF temperature must be lower than Fan ON temperature.",
      );
      return;
    }

    if (criticalRuntime >= lowRuntime) {
      showError(
        "Invalid runtime thresholds",
        "Critical runtime threshold must be lower than low runtime threshold.",
      );
      return;
    }

    try {
      setSaving(true);

      const updatedSettings = await updateRuntimeSettings(DEFAULT_DEVICE_ID, {
        fan_on_temperature: fanOn,
        fan_off_temperature: fanOff,
        low_runtime_threshold_minutes: lowRuntime,
        critical_runtime_threshold_minutes: criticalRuntime,
        demo_ups_full_drain_seconds_at_100_load: drainSeconds,
        demo_battery_recovery_percent_per_second: recoveryRate,
        demo_restart_battery_percent: restartPercent,
      });

      setSettings(updatedSettings);

      showInfo(
        "Settings saved",
        "Runtime settings were updated. The ESP32 should apply them on its next settings poll.",
      );
    } catch (error) {
      showError(
        "Save failed",
        "Could not save settings. Check that your user role is admin/operator and that the values are valid.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

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
        <Text style={styles.loadingText}>Loading runtime settings...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 90,
          },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Runtime Settings</Text>
            <Text style={styles.subtitle}>Backend-managed ESP32 tuning</Text>
          </View>

          <Pressable
            style={styles.backButton}
            onPress={() => router.replace("/dashboard")}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cooling Fan Thresholds</Text>

          <SettingsInput
            label="Fan ON Temperature (°C)"
            value={fanOnTemperature}
            onChangeText={setFanOnTemperature}
          />

          <SettingsInput
            label="Fan OFF Temperature (°C)"
            value={fanOffTemperature}
            onChangeText={setFanOffTemperature}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Runtime Thresholds</Text>

          <SettingsInput
            label="Low Runtime Threshold (minutes)"
            value={lowRuntimeThresholdMinutes}
            onChangeText={setLowRuntimeThresholdMinutes}
          />

          <SettingsInput
            label="Critical Runtime Threshold (minutes)"
            value={criticalRuntimeThresholdMinutes}
            onChangeText={setCriticalRuntimeThresholdMinutes}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>UPS Simulation Settings</Text>

          <SettingsInput
            label="Full Drain Seconds at 100% Load"
            value={demoUpsDrainSeconds}
            onChangeText={setDemoUpsDrainSeconds}
          />

          <SettingsInput
            label="Battery Recovery % per Second"
            value={batteryRecoveryPercentPerSecond}
            onChangeText={setBatteryRecoveryPercentPerSecond}
          />

          <SettingsInput
            label="Restart Battery Percent"
            value={restartBatteryPercent}
            onChangeText={setRestartBatteryPercent}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings Metadata</Text>
          <InfoRow
            label="Device"
            value={settings?.device_id || DEFAULT_DEVICE_ID}
          />
          <InfoRow
            label="Version"
            value={settings ? String(settings.settings_version) : "--"}
          />
          <InfoRow
            label="Updated"
            value={formatDateTime(settings?.updated_at)}
          />
        </View>

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Runtime Settings</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SettingsInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        style={styles.input}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6b7280",
  },
  backButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "700",
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
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  infoLabel: {
    color: "#6b7280",
  },
  infoValue: {
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  saveButton: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
});
