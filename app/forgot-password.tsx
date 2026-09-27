import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { requestPasswordReset } from "../services/authService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phase 18 — requests Supabase's own built-in password-recovery email.
 * Matches login.tsx/signup.tsx's own visual style exactly (inline colors,
 * no SafeAreaView) — this is the same pre-auth screen family, reached only
 * from login.tsx's new "Forgot password?" link.
 *
 * Never distinguishes "no account for this email" from "email sent" —
 * requestPasswordReset (services/authService.ts) resolves the same way
 * either way, by design (anti-enumeration), so this screen always shows
 * one neutral confirmation on any non-error response.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();

    if (!trimmed) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmed)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setSubmitting(true);

    const { error } = await requestPasswordReset(
      trimmed,
      Linking.createURL("reset-password"),
    );

    setSubmitting(false);

    if (error) {
      Alert.alert(
        "Something Went Wrong",
        "We couldn't send the reset email right now. Please check your connection and try again.",
      );
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>Velyqo</Text>

        <Text style={styles.title}>Check your email</Text>

        <Text style={styles.body}>
          If an account exists for {email.trim()}, we&apos;ve sent a link to
          reset your password. It may take a few minutes to arrive.
        </Text>

        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={styles.link}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Velyqo</Text>

      <Text style={styles.title}>Reset your password</Text>

      <Text style={styles.body}>
        Enter the email address on your account and we&apos;ll send you a
        link to reset your password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94A3B8"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!submitting}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Sending..." : "Send Reset Link"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    color: "#7C3AED",
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },

  body: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
  },

  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  button: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  link: {
    color: "#A78BFA",
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
  },
});
