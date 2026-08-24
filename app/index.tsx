import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getSession } from "../services/authService";

export default function WelcomeScreen() {
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const {
      data: { session },
    } = await getSession();

    if (session) {
      router.replace("/(app)/dashboard");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VELYQO</Text>

      <Text style={styles.tagline}>Engineer Your Future with AI</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("/signup")}
      >
        <Text style={styles.primaryText}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.secondaryText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/onboarding/name")}>
        <Text style={styles.guestText}>Continue as Guest</Text>
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
    fontSize: 46,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 2,
  },

  tagline: {
    color: "#CBD5E1",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 60,
  },

  primaryButton: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  guestText: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 28,
    fontSize: 15,
  },
});
