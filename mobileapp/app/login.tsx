import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { loginUser } from "../src/api/client";
import { saveToken } from "../src/storage/authStorage";
import { registerDeviceForRemotePush } from "../src/services/notificationService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../src/theme/colors";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter email and password.");
      Alert.alert("Missing details", "Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      console.log("Trying login...");
      const response = await loginUser(email.trim(), password);

      console.log("Login successful");
      await saveToken(response.access_token);

      try {
        await registerDeviceForRemotePush();
      } catch (error) {
        console.log("[Notifications] Push registration failed:", error);
      }

      router.replace("/dashboard");
    } catch (error) {
      console.log("Login error:", error);

      setErrorMessage(
        "Login failed. Check your email, password, backend URL, and backend server.",
      );

      Alert.alert(
        "Login failed",
        "Check your email, password, backend URL, and network connection.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        },
      ]}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>ServerSensei</Text>
        <Text style={styles.subtitle}>Mobile Monitoring App</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="admin@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: colors.mutedText,
    marginTop: 6,
    marginBottom: 30,
  },
  label: {
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 12,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 14,
    marginTop: 24,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 16,
  },
  errorText: {
    color: colors.critical,
    marginTop: 12,
    fontWeight: "700",
  },
});
