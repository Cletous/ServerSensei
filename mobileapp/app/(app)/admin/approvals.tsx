import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  approveCommand,
  getAuditLogs,
  getCommandsAwaitingApproval,
  rejectCommand,
} from "../../../src/api/client";
import { getStoredUserRole } from "../../../src/storage/authStorage";
import { colors } from "../../../src/theme/colors";
import type { AuditLogResponse, CommandResponse } from "../../../src/types/api";
import { formatDateTime } from "../../../src/utils/dateTime";
import { showError, showInfo } from "@/src/utils/dialogs";

function getRequesterLabel(command: CommandResponse) {
  return (
    command.created_by_user_name?.trim() ||
    command.created_by_user_email?.trim() ||
    (command.created_by_user_id
      ? `User #${command.created_by_user_id}`
      : "Unknown requester")
  );
}

export default function CommandApprovalsScreen() {
  const insets = useSafeAreaInsets();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [approvals, setApprovals] = useState<CommandResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [busyCommandId, setBusyCommandId] = useState<number | null>(null);

  async function loadData(showSpinner = true) {
    try {
      if (showSpinner) {
        setLoading(true);
      }

      const [approvalData, auditData] = await Promise.all([
        getCommandsAwaitingApproval(),
        getAuditLogs(50),
      ]);

      setApprovals(approvalData);
      setAuditLogs(auditData);
    } catch {
      showError(
        "Admin error",
        "Could not load command approvals or audit trail.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function start() {
      const role = await getStoredUserRole();

      if (role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setCheckingAccess(false);
      await loadData();
    }

    start();
  }, []);

  async function refresh() {
    setRefreshing(true);
    await loadData(false);
  }

  async function approve(command: CommandResponse) {
    try {
      setBusyCommandId(command.id);
      await approveCommand(command.id);
      await loadData(false);

      showInfo(
        "Command approved",
        "The command has been queued for ESP32 execution.",
      );
    } catch {
      showError("Approval failed", "Could not approve this command.");
    } finally {
      setBusyCommandId(null);
    }
  }

  async function reject(command: CommandResponse) {
    try {
      setBusyCommandId(command.id);
      await rejectCommand(command.id);
      await loadData(false);

      showInfo(
        "Command rejected",
        "The command has been rejected and will not be executed.",
      );
    } catch {
      showError("Rejection failed", "Could not reject this command.");
    } finally {
      setBusyCommandId(null);
    }
  }

  function confirmApprove(command: CommandResponse) {
    Alert.alert(
      "Approve command",
      `Approve ${command.action} requested by ${getRequesterLabel(command)}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => approve(command) },
      ],
    );
  }

  function confirmReject(command: CommandResponse) {
    Alert.alert(
      "Reject command",
      `Reject ${command.action} requested by ${getRequesterLabel(command)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => reject(command),
        },
      ],
    );
  }

  if (checkingAccess || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading command approvals...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 28,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
        <Text style={styles.backButtonText}>Admin Console</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Admin</Text>
        <Text style={styles.title}>Command Approval Inbox</Text>
        <Text style={styles.subtitle}>
          Review operator requests before they are sent to the ESP32.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Requests</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{approvals.length}</Text>
        </View>
      </View>

      {approvals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="checkmark-circle-outline"
            size={30}
            color={colors.primary}
          />
          <Text style={styles.emptyTitle}>No pending approvals</Text>
          <Text style={styles.emptyText}>
            Operator command requests will appear here.
          </Text>
        </View>
      ) : (
        approvals.map((command) => {
          const isBusy = busyCommandId === command.id;
          const requester = getRequesterLabel(command);

          return (
            <View key={command.id} style={styles.commandCard}>
              <View style={styles.commandTopRow}>
                <View style={styles.commandIcon}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.commandTextBlock}>
                  <Text style={styles.commandAction}>{command.action}</Text>
                  <Text style={styles.commandMeta}>
                    Requested by {requester}
                  </Text>
                  <Text style={styles.commandMeta}>
                    Device: {command.device_id}
                  </Text>
                  <Text style={styles.commandMeta}>
                    Time: {formatDateTime(command.created_at)}
                  </Text>
                </View>
              </View>

              {command.payload ? (
                <Text style={styles.payloadText}>
                  {JSON.stringify(command.payload)}
                </Text>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  disabled={isBusy}
                  style={[styles.rejectButton, isBusy && styles.disabledButton]}
                  onPress={() => confirmReject(command)}
                >
                  <Text style={styles.rejectButtonText}>
                    {isBusy ? "Working..." : "Reject"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={isBusy}
                  style={[
                    styles.approveButton,
                    isBusy && styles.disabledButton,
                  ]}
                  onPress={() => confirmApprove(command)}
                >
                  <Text style={styles.approveButtonText}>
                    {isBusy ? "Working..." : "Approve"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <View style={styles.auditHeader}>
        <Text style={styles.sectionTitle}>Audit Trail</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{auditLogs.length}</Text>
        </View>
      </View>

      {auditLogs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={30} color={colors.primary} />
          <Text style={styles.emptyTitle}>No audit activity yet</Text>
          <Text style={styles.emptyText}>
            Approvals, rejections, and user management actions will appear here.
          </Text>
        </View>
      ) : (
        auditLogs.map((log) => (
          <View key={log.id} style={styles.auditCard}>
            <Text style={styles.auditAction}>{log.action}</Text>
            <Text style={styles.auditDescription}>{log.description}</Text>
            <Text style={styles.auditMeta}>
              {formatDateTime(log.created_at)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
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
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.mutedText,
    fontWeight: "800",
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: "900",
  },
  header: {
    marginBottom: 22,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
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
    lineHeight: 21,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  auditHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: {
    color: colors.primary,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyText: {
    color: colors.mutedText,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 19,
  },
  commandCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  commandTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  commandIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  commandTextBlock: {
    flex: 1,
  },
  commandAction: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  commandMeta: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  payloadText: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 10,
    marginTop: 12,
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.critical,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectButtonText: {
    color: colors.critical,
    fontWeight: "900",
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  approveButtonText: {
    color: colors.white,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.55,
  },
  auditCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  auditAction: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  auditDescription: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6,
  },
  auditMeta: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
});
