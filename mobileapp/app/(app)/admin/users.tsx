import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createAdminUser,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../../../src/api/client";
import { getStoredUserRole } from "../../../src/storage/authStorage";
import { colors } from "../../../src/theme/colors";
import type { UserItem, UserRole } from "../../../src/types/api";
import { showError, showInfo } from "@/src/utils/dialogs";

const ROLES: UserRole[] = ["admin", "operator", "viewer"];

function getRoleDescription(role: UserRole) {
  if (role === "admin") {
    return "Full control";
  }

  if (role === "operator") {
    return "Can request approved operations";
  }

  return "Monitoring only";
}

export default function UserManagementScreen() {
  const insets = useSafeAreaInsets();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("viewer");
  const [creating, setCreating] = useState(false);

  async function loadUsers(showSpinner = true) {
    try {
      if (showSpinner) {
        setLoading(true);
      }

      const data = await getAdminUsers();
      setUsers(data);
    } catch {
      showError("Users error", "Could not load users.");
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
      await loadUsers();
    }

    start();
  }, []);

  async function refresh() {
    setRefreshing(true);
    await loadUsers(false);
  }

  async function changeRole(user: UserItem, role: UserRole) {
    if (user.role === role) {
      return;
    }

    try {
      setBusyUserId(user.id);
      await updateAdminUserRole(user.id, { role });
      await loadUsers(false);
    } catch {
      showError("Role update failed", "Could not update this user role.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function changeStatus(user: UserItem, active: boolean) {
    try {
      setBusyUserId(user.id);
      await updateAdminUserStatus(user.id, { active });
      await loadUsers(false);
    } catch {
      showError("Status update failed", "Could not update this user status.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function createUser() {
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();

    if (!name || !email) {
      showError("Missing details", "Enter the user's name and email.");
      return;
    }

    try {
      setCreating(true);

      await createAdminUser({
        name,
        email,
        role: newRole,
      });

      setNewName("");
      setNewEmail("");
      setNewRole("viewer");
      setShowCreateForm(false);

      await loadUsers(false);

      showInfo(
        "User created",
        "The user account was created. Default password: Pass@123",
      );
    } catch {
      showError(
        "User creation failed",
        "Could not create the user. Check that the email is not already registered.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (checkingAccess || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading users...</Text>
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
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          Create users, assign roles, and control account access.
        </Text>
      </View>

      <Pressable
        style={styles.createToggleButton}
        onPress={() => setShowCreateForm((value) => !value)}
      >
        <Ionicons
          name={showCreateForm ? "close-outline" : "person-add-outline"}
          size={20}
          color={colors.white}
        />
        <Text style={styles.createToggleText}>
          {showCreateForm ? "Cancel New User" : "Create New User"}
        </Text>
      </Pressable>

      {showCreateForm ? (
        <View style={styles.createCard}>
          <Text style={styles.cardTitle}>New User</Text>

          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Example: Tawanda Moyo"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="user@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Role</Text>
          <View style={styles.roleRow}>
            {ROLES.map((role) => {
              const selected = role === newRole;

              return (
                <Pressable
                  key={role}
                  style={[
                    styles.roleButton,
                    selected && styles.roleButtonSelected,
                  ]}
                  onPress={() => setNewRole(role)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      selected && styles.roleButtonTextSelected,
                    ]}
                  >
                    {role}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            disabled={creating}
            style={[styles.saveButton, creating && styles.disabledButton]}
            onPress={createUser}
          >
            <Text style={styles.saveButtonText}>
              {creating ? "Creating..." : "Create User"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Existing Users</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{users.length}</Text>
        </View>
      </View>

      {users.map((user) => {
        const isBusy = busyUserId === user.id;

        return (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userTopRow}>
              <View style={styles.userIcon}>
                <Ionicons
                  name={
                    user.role === "admin"
                      ? "shield-checkmark-outline"
                      : user.role === "operator"
                        ? "construct-outline"
                        : "eye-outline"
                  }
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.name || "Unnamed user"}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userMeta}>
                  {getRoleDescription(user.role)}
                </Text>
              </View>
            </View>

            <View style={styles.roleRow}>
              {ROLES.map((role) => {
                const selected = role === user.role;

                return (
                  <Pressable
                    key={role}
                    disabled={isBusy}
                    style={[
                      styles.roleButton,
                      selected && styles.roleButtonSelected,
                      isBusy && styles.disabledButton,
                    ]}
                    onPress={() => changeRole(user, role)}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        selected && styles.roleButtonTextSelected,
                      ]}
                    >
                      {role}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusTitle}>Account active</Text>
                <Text style={styles.statusSubtitle}>
                  Disabled users cannot log in.
                </Text>
              </View>

              <Switch
                value={user.active}
                disabled={isBusy}
                onValueChange={(active) => changeStatus(user, active)}
              />
            </View>
          </View>
        );
      })}
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
    marginBottom: 18,
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
  createToggleButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  createToggleText: {
    color: colors.white,
    fontWeight: "900",
  },
  createCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  userCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  userTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  userIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  userEmail: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  userMeta: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  roleButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  roleButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  roleButtonTextSelected: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.55,
  },
  statusRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 14,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  statusSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
});
