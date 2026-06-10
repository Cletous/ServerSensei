import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  approveCommand,
  getAdminUsers,
  getCommandsAwaitingApproval,
  rejectCommand,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../../src/api/client";
import {
  getStoredUser,
  getStoredUserRole,
} from "../../src/storage/authStorage";
import { colors } from "../../src/theme/colors";
import type { CommandResponse, UserItem, UserRole } from "../../src/types/api";

const ROLES: UserRole[] = ["admin", "operator", "viewer"];

function getRoleDescription(role: UserRole) {
  if (role === "admin") {
    return "Full control";
  }

  if (role === "operator") {
    return "Can operate approved controls";
  }

  return "Monitoring only";
}

function getRoleIcon(role: UserRole) {
  if (role === "admin") {
    return "shield-checkmark-outline";
  }

  if (role === "operator") {
    return "construct-outline";
  }

  return "eye-outline";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminScreen() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [approvals, setApprovals] = useState<CommandResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [busyCommandId, setBusyCommandId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const activeUsers = useMemo(
    () => users.filter((user) => user.active).length,
    [users],
  );

  const adminUsers = useMemo(
    () => users.filter((user) => user.role === "admin").length,
    [users],
  );

  const operatorUsers = useMemo(
    () => users.filter((user) => user.role === "operator").length,
    [users],
  );

  const pendingApprovals = useMemo(
    () =>
      approvals.filter((command) => command.status === "awaiting_approval")
        .length,
    [approvals],
  );

  async function loadUsers(showError = true) {
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch {
      if (showError) {
        Alert.alert(
          "Admin access required",
          "Only administrators can manage users.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadApprovals(showError = true) {
    try {
      const data = await getCommandsAwaitingApproval();
      setApprovals(data);
    } catch {
      if (showError) {
        Alert.alert(
          "Approval inbox unavailable",
          "Could not load pending command approvals.",
        );
      }
    } finally {
      setLoadingApprovals(false);
    }
  }

  useEffect(() => {
    async function checkAccessAndLoadUsers() {
      const role = await getStoredUserRole();
      const storedUser = await getStoredUser();

      if (role !== "admin") {
        Alert.alert(
          "Admin access required",
          "Only administrators can manage users.",
        );

        router.replace("/dashboard");
        return;
      }

      setCurrentUserId(storedUser?.id ?? null);
      setCheckingAccess(false);

      await loadUsers();
      await loadApprovals(false);
    }

    checkAccessAndLoadUsers();
  }, []);

  async function refreshUsers() {
    setRefreshing(true);
    await loadUsers(false);
    await loadApprovals(false);
    setRefreshing(false);
  }

  function confirmRoleChange(user: UserItem, role: UserRole) {
    if (user.role === role) {
      return;
    }

    const isSelf = user.id === currentUserId;

    if (isSelf && role !== "admin") {
      Alert.alert("Action blocked", "You cannot remove your own admin role.");
      return;
    }

    Alert.alert(
      "Change user role",
      `Change ${user.email} from ${user.role} to ${role}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Change Role",
          style: role === "admin" ? "default" : "destructive",
          onPress: () => changeRole(user, role),
        },
      ],
    );
  }

  async function changeRole(user: UserItem, role: UserRole) {
    try {
      setBusyUserId(user.id);
      await updateAdminUserRole(user.id, { role });
      await loadUsers(false);
    } catch {
      Alert.alert("Update failed", "Could not update user role.");
    } finally {
      setBusyUserId(null);
    }
  }

  function confirmStatusToggle(user: UserItem) {
    const isSelf = user.id === currentUserId;

    if (isSelf && user.active) {
      Alert.alert("Action blocked", "You cannot disable your own account.");
      return;
    }

    Alert.alert(
      user.active ? "Disable account" : "Enable account",
      user.active
        ? `Disable ${user.email}? They will no longer be able to log in.`
        : `Enable ${user.email}? They will be able to log in again.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: user.active ? "Disable" : "Enable",
          style: user.active ? "destructive" : "default",
          onPress: () => toggleStatus(user),
        },
      ],
    );
  }

  async function toggleStatus(user: UserItem) {
    try {
      setBusyUserId(user.id);
      await updateAdminUserStatus(user.id, { active: !user.active });
      await loadUsers(false);
    } catch {
      Alert.alert("Update failed", "Could not update user status.");
    } finally {
      setBusyUserId(null);
    }
  }

  function confirmApproveCommand(command: CommandResponse) {
    Alert.alert(
      "Approve command",
      `Approve ${command.action} for ${command.device_id}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: () => approveApprovalRequest(command.id),
        },
      ],
    );
  }

  async function approveApprovalRequest(commandId: number) {
    try {
      setBusyCommandId(commandId);
      await approveCommand(commandId);
      await loadApprovals(false);

      Alert.alert(
        "Command approved",
        "The command has been approved and queued for ESP32 execution.",
      );
    } catch {
      Alert.alert("Approval failed", "Could not approve this command.");
    } finally {
      setBusyCommandId(null);
    }
  }

  function confirmRejectCommand(command: CommandResponse) {
    Alert.alert(
      "Reject command",
      `Reject ${command.action} for ${command.device_id}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => rejectApprovalRequest(command.id),
        },
      ],
    );
  }

  async function rejectApprovalRequest(commandId: number) {
    try {
      setBusyCommandId(commandId);
      await rejectCommand(commandId);
      await loadApprovals(false);

      Alert.alert(
        "Command rejected",
        "The command has been rejected and will not be executed.",
      );
    } catch {
      Alert.alert("Rejection failed", "Could not reject this command.");
    } finally {
      setBusyCommandId(null);
    }
  }

  if (checkingAccess || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading admin controls...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshUsers} />
      }
    >
      <View style={styles.approvalSection}>
        <View style={styles.approvalHeader}>
          <View>
            <Text style={styles.approvalTitle}>Command Approval Inbox</Text>
            <Text style={styles.approvalSubtitle}>
              Review supervised commands before they reach the ESP32.
            </Text>
          </View>

          <View style={styles.approvalCountBadge}>
            <Text style={styles.approvalCountText}>{pendingApprovals}</Text>
          </View>
        </View>

        {loadingApprovals ? (
          <View style={styles.approvalLoadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.approvalLoadingText}>
              Loading approval requests...
            </Text>
          </View>
        ) : approvals.length === 0 ? (
          <View style={styles.emptyApprovalCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={30}
              color={colors.primary}
            />
            <Text style={styles.emptyApprovalTitle}>No pending approvals</Text>
            <Text style={styles.emptyApprovalText}>
              Non-admin command requests will appear here.
            </Text>
          </View>
        ) : (
          approvals.map((command) => {
            const isBusy = busyCommandId === command.id;

            return (
              <View key={command.id} style={styles.approvalCard}>
                <View style={styles.commandTopRow}>
                  <View style={styles.commandIcon}>
                    <Ionicons
                      name="terminal-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.commandTitleWrap}>
                    <Text style={styles.commandAction}>{command.action}</Text>
                    <Text style={styles.commandMeta}>
                      Device: {command.device_id}
                    </Text>
                  </View>

                  <View style={styles.commandStatusBadge}>
                    <Text style={styles.commandStatusText}>
                      {command.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <View style={styles.commandDetails}>
                  <Text style={styles.commandDetailText}>
                    Requested by user: #
                    {command.created_by_user_id ?? "Unknown"}
                  </Text>

                  <Text style={styles.commandDetailText}>
                    Requested: {formatDate(command.created_at)}
                  </Text>

                  <Text style={styles.payloadLabel}>Payload</Text>
                  <Text style={styles.payloadText}>
                    {command.payload
                      ? JSON.stringify(command.payload, null, 2)
                      : "No payload"}
                  </Text>
                </View>

                <View style={styles.approvalActions}>
                  <Pressable
                    disabled={isBusy}
                    style={[
                      styles.rejectButton,
                      isBusy && styles.disabledActionButton,
                    ]}
                    onPress={() => confirmRejectCommand(command)}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color={colors.critical}
                    />
                    <Text style={styles.rejectButtonText}>
                      {isBusy ? "Working..." : "Reject"}
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={isBusy}
                    style={[
                      styles.approveButton,
                      isBusy && styles.disabledActionButton,
                    ]}
                    onPress={() => confirmApproveCommand(command)}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={colors.white}
                    />
                    <Text style={styles.approveButtonText}>
                      {isBusy ? "Working..." : "Approve"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={28}
              color={colors.primary}
            />
          </View>

          <Pressable style={styles.refreshButton} onPress={refreshUsers}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          Manage system access, operational roles, and account status.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>{activeUsers}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>{adminUsers}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>{operatorUsers}</Text>
            <Text style={styles.statLabel}>Operators</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Accounts</Text>
        <Text style={styles.sectionSubtitle}>
          Pull down or tap Refresh to update the list.
        </Text>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={32} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptyText}>
            Registered users will appear here.
          </Text>
        </View>
      ) : (
        users.map((user) => {
          const isSelf = user.id === currentUserId;
          const busy = busyUserId === user.id;

          return (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userTopRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {user.email.slice(0, 1).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.userIdentity}>
                  <View style={styles.emailRow}>
                    <Text style={styles.email} numberOfLines={1}>
                      {user.email}
                    </Text>

                    {isSelf ? (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.meta}>
                    Created {formatDate(user.created_at)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    user.active ? styles.activePill : styles.disabledPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      user.active ? styles.activeText : styles.disabledText,
                    ]}
                  >
                    {user.active ? "Active" : "Disabled"}
                  </Text>
                </View>
              </View>

              <View style={styles.roleInfoPanel}>
                <View style={styles.roleInfoIcon}>
                  <Ionicons
                    name={getRoleIcon(user.role)}
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <View>
                  <Text style={styles.currentRoleLabel}>Current role</Text>
                  <Text style={styles.currentRoleValue}>
                    {user.role.toUpperCase()} · {getRoleDescription(user.role)}
                  </Text>
                </View>
              </View>

              <Text style={styles.controlLabel}>Change role</Text>

              <View style={styles.roleRow}>
                {ROLES.map((role) => {
                  const selected = user.role === role;

                  return (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleButton,
                        selected && styles.roleButtonActive,
                        busy && styles.disabledControl,
                      ]}
                      disabled={busy}
                      onPress={() => confirmRoleChange(user, role)}
                    >
                      <Ionicons
                        name={getRoleIcon(role)}
                        size={16}
                        color={selected ? colors.white : colors.text}
                      />
                      <Text
                        style={[
                          styles.roleButtonText,
                          selected && styles.roleButtonTextActive,
                        ]}
                      >
                        {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.safetyNote}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={colors.mutedText}
                  />
                  <Text style={styles.safetyNoteText}>
                    {isSelf
                      ? "Self-lockout protection enabled"
                      : "Admin controlled account"}
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.statusButton,
                    user.active ? styles.disableButton : styles.enableButton,
                    busy && styles.disabledControl,
                  ]}
                  disabled={busy}
                  onPress={() => confirmStatusToggle(user)}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          user.active
                            ? "ban-outline"
                            : "checkmark-circle-outline"
                        }
                        size={18}
                        color={colors.white}
                      />
                      <Text style={styles.statusButtonText}>
                        {user.active ? "Disable" : "Enable"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })
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
    padding: 18,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.mutedText,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: "900",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
    marginTop: 6,
    lineHeight: 21,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.mutedText,
    marginTop: 3,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
  },
  emptyText: {
    marginTop: 4,
    color: colors.mutedText,
    fontWeight: "600",
  },
  userCard: {
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  userIdentity: {
    flex: 1,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  email: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  youBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  youBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  meta: {
    marginTop: 3,
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activePill: {
    backgroundColor: colors.primarySoft,
  },
  disabledPill: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  activeText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.critical,
  },
  roleInfoPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  currentRoleLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
  },
  currentRoleValue: {
    marginTop: 2,
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
  },
  controlLabel: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.text,
    fontWeight: "900",
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  roleButtonTextActive: {
    color: colors.white,
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  safetyNote: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  safetyNoteText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  statusButton: {
    minWidth: 108,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
  },
  disableButton: {
    backgroundColor: colors.critical,
  },
  enableButton: {
    backgroundColor: colors.primary,
  },
  statusButtonText: {
    color: colors.white,
    fontWeight: "900",
  },
  disabledControl: {
    opacity: 0.55,
  },
  approvalSection: {
    marginTop: 18,
    marginBottom: 18,
  },
  approvalHeader: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  approvalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
  },
  approvalSubtitle: {
    marginTop: 4,
    color: colors.mutedText,
    fontWeight: "700",
    lineHeight: 19,
  },
  approvalCountBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  approvalCountText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
  },
  approvalLoadingCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
    gap: 10,
  },
  approvalLoadingText: {
    color: colors.mutedText,
    fontWeight: "800",
  },
  emptyApprovalCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
  },
  emptyApprovalTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
  },
  emptyApprovalText: {
    marginTop: 4,
    color: colors.mutedText,
    textAlign: "center",
    fontWeight: "700",
  },
  approvalCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  commandTopRow: {
    flexDirection: "row",
    alignItems: "center",
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
  commandTitleWrap: {
    flex: 1,
  },
  commandAction: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  commandMeta: {
    marginTop: 3,
    color: colors.mutedText,
    fontWeight: "700",
  },
  commandStatusBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  commandStatusText: {
    color: "#92400E",
    fontWeight: "900",
    fontSize: 11,
    textTransform: "capitalize",
  },
  commandDetails: {
    marginTop: 14,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 12,
  },
  commandDetailText: {
    color: colors.mutedText,
    fontWeight: "700",
    marginBottom: 5,
  },
  payloadLabel: {
    marginTop: 8,
    marginBottom: 4,
    color: colors.text,
    fontWeight: "900",
  },
  payloadText: {
    color: colors.text,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  approvalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
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
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  approveButtonText: {
    color: colors.white,
    fontWeight: "900",
  },
  disabledActionButton: {
    opacity: 0.6,
  },
});
