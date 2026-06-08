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

export default function LoginScreen() {
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
      style={styles.container}
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
    padding: 20,
    backgroundColor: "#f3f4f6",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#666",
    marginBottom: 28,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  button: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 8,
    marginTop: 22,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  errorText: {
    color: "#b91c1c",
    marginTop: 12,
    fontWeight: "600",
  },
});
