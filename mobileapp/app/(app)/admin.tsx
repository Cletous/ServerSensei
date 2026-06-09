import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../../src/api/client";
import { colors } from "../../src/theme/colors";
import type { UserItem } from "../../src/types/api";

export default function AdminScreen() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (error) {
      Alert.alert(
        "Admin access required",
        "Only administrators can manage users.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function changeRole(user: UserItem, role: UserItem["role"]) {
    try {
      await updateAdminUserRole(user.id, { role });
      await loadUsers();
    } catch {
      Alert.alert("Update failed", "Could not update user role.");
    }
  }

  async function toggleStatus(user: UserItem) {
    try {
      await updateAdminUserStatus(user.id, { active: !user.active });
      await loadUsers();
    } catch {
      Alert.alert("Update failed", "Could not update user status.");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="people-outline" size={24} color={colors.primary} />
        </View>

        <View>
          <Text style={styles.title}>Admin</Text>
          <Text style={styles.subtitle}>Manage users and permissions.</Text>
        </View>
      </View>

      {users.map((user) => (
        <View key={user.id} style={styles.card}>
          <View style={styles.userTopRow}>
            <View>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.meta}>Role: {user.role}</Text>
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

          <View style={styles.roleRow}>
            {(["admin", "operator", "viewer"] as const).map((role) => (
              <Pressable
                key={role}
                style={[
                  styles.roleButton,
                  user.role === role && styles.roleButtonActive,
                ]}
                onPress={() => changeRole(user, role)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    user.role === role && styles.roleButtonTextActive,
                  ]}
                >
                  {role}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.statusButton}
            onPress={() => toggleStatus(user)}
          >
            <Ionicons
              name={user.active ? "ban-outline" : "checkmark-circle-outline"}
              size={18}
              color={colors.white}
            />
            <Text style={styles.statusButtonText}>
              {user.active ? "Disable User" : "Enable User"}
            </Text>
          </Pressable>
        </View>
      ))}
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
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
    marginTop: 3,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  email: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
  },
  meta: {
    color: colors.mutedText,
    marginTop: 4,
    textTransform: "capitalize",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  activePill: {
    backgroundColor: colors.primarySoft,
  },
  disabledPill: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontWeight: "900",
    fontSize: 12,
  },
  activeText: {
    color: colors.primaryDark,
  },
  disabledText: {
    color: colors.critical,
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  roleButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    fontWeight: "900",
    color: colors.mutedText,
    textTransform: "capitalize",
  },
  roleButtonTextActive: {
    color: colors.white,
  },
  statusButton: {
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  statusButtonText: {
    color: colors.white,
    fontWeight: "900",
  },
});
