import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { signOut, updatePassword } from "../services/authService";
import type { ThemeColors } from "../constants/theme";
import { useThemeColors, useThemedStyles } from "../context/ThemeContext";

type ScreenState = "verifying" | "ready" | "invalid";

function parseParamSegment(segment: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const pair of segment.split("&")) {
    if (!pair) {
      continue;
    }

    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);

    if (!rawKey) {
      continue;
    }

    try {
      result[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    } catch {
      result[rawKey] = rawValue;
    }
  }

  return result;
}

/**
 * Combines the deep link's query string and hash fragment into one param
 * map. Supabase's own recovery link can carry its tokens in either,
 * depending on the project's configured auth flow (PKCE -> a `code` query
 * param; implicit -> `access_token`/`refresh_token`, conventionally in the
 * hash) — handling both means this works correctly regardless of that
 * server-side setting, which this app's own code has no visibility into
 * or control over.
 */
function extractRecoveryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");

  const params: Record<string, string> = {};

  if (queryIndex !== -1) {
    const end = hashIndex > queryIndex ? hashIndex : url.length;
    Object.assign(params, parseParamSegment(url.slice(queryIndex + 1, end)));
  }

  if (hashIndex !== -1) {
    Object.assign(params, parseParamSegment(url.slice(hashIndex + 1)));
  }

  return params;
}

/**
 * Phase 18 — the target of Supabase's password-recovery email link
 * (requested from forgot-password.tsx, which passes
 * Linking.createURL("reset-password") as the redirect). Establishes a
 * temporary recovery session from the link's own tokens, then lets the
 * user set a new password — the standard Supabase-recommended pattern,
 * no custom password backend.
 *
 * Deliberately signs the user out again immediately after a successful
 * password change (see handleSetPassword below) rather than leaving them
 * silently signed in on the recovery session, so setting a new password
 * always ends at one clear, familiar place: a fresh sign-in with it.
 */
export default function ResetPasswordScreen() {
  const Colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  // Not Linking.useURL(): that hook's state starts at `null` and can never
  // be `undefined` (see its own source), so there is no way to tell "still
  // resolving" apart from "genuinely no link" from its return value alone.
  // Tracking resolution explicitly avoids ever mistaking "haven't checked
  // yet" for "checked, nothing there."
  const [url, setUrl] = useState<string | null>(null);
  const [initialUrlResolved, setInitialUrlResolved] = useState(false);

  const [state, setState] = useState<ScreenState>("verifying");
  const processedRef = useRef(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Linking.getInitialURL().then((initialUrl) => {
      if (!isMounted) {
        return;
      }

      setUrl(initialUrl);
      setInitialUrlResolved(true);
    });

    const subscription = Linking.addEventListener("url", (event) => {
      setUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (processedRef.current) {
      return;
    }

    // Wait for the initial Linking check to actually finish before
    // deciding there is no recovery URL.
    if (!initialUrlResolved) {
      return;
    }

    processedRef.current = true;

    const establishSession = async () => {
      if (!url) {
        setState("invalid");
        return;
      }

      const params = extractRecoveryParams(url);

      if (params.error_description || params.error) {
        setState("invalid");
        return;
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        setState(error ? "invalid" : "ready");
        return;
      }

      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        setState(error ? "invalid" : "ready");
        return;
      }

      setState("invalid");
    };

    establishSession();
  }, [initialUrlResolved, url]);

  const handleSetPassword = async () => {
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords Don't Match",
        "Please make sure both passwords are the same.",
      );
      return;
    }

    setSubmitting(true);

    const { error } = await updatePassword(password);

    if (error) {
      setSubmitting(false);
      Alert.alert(
        "Something Went Wrong",
        "We couldn't update your password right now. Please try the reset link again.",
      );
      return;
    }

    await signOut().catch(() => {});

    setSubmitting(false);

    Alert.alert(
      "Password Updated",
      "Please sign in with your new password.",
      [{ text: "OK", onPress: () => router.replace("/login") }],
    );
  };

  if (state === "verifying") {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>Velyqo</Text>
        <Text style={styles.body}>Verifying your reset link...</Text>
      </View>
    );
  }

  if (state === "invalid") {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>Velyqo</Text>

        <Text style={styles.title}>This link isn&apos;t valid</Text>

        <Text style={styles.body}>
          This password reset link is invalid or has expired. Please request
          a new one.
        </Text>

        <TouchableOpacity onPress={() => router.replace("/forgot-password")}>
          <Text style={styles.link}>Request a New Link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Velyqo</Text>

      <Text style={styles.title}>Set a new password</Text>

      <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor={Colors.subtext}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!submitting}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        placeholderTextColor={Colors.subtext}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!submitting}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSetPassword}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Saving..." : "Set New Password"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    color: Colors.primary,
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },

  body: {
    color: Colors.subtext,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
  },

  input: {
    backgroundColor: Colors.card,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  link: {
    color: Colors.link,
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
  },
});
