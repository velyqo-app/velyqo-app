import { Redirect, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getSession } from "../services/authService";
import { getProfile } from "../services/profileService";

type SessionStatus = "checking" | "signed-out" | "needs-onboarding" | "ready";

export default function WelcomeScreen() {
  const [status, setStatus] = useState<SessionStatus>("checking");

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await getSession();

        if (!active) {
          return;
        }

        if (!session) {
          setStatus("signed-out");
          return;
        }

        // A signed-in user without a saved profile has not finished
        // onboarding, and the dashboard has nothing to show them.
        let hasProfile: boolean;

        try {
          const { data: profile } = await getProfile(session.user.id);

          hasProfile = Boolean(profile?.target_role);
        } catch {
          // Treat a lookup failure as "already onboarded", so a transient
          // network error never pushes a returning user back through
          // onboarding and over their saved answers.
          hasProfile = true;
        }

        if (active) {
          setStatus(hasProfile ? "ready" : "needs-onboarding");
        }
      } catch {
        // A storage/network failure must still resolve, or the splash would
        // stay up forever. Fall back to the signed-out screen.
        if (active) {
          setStatus("signed-out");
        }
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  // Runs after the render that resolved the check has committed, so the
  // redirect is already in place by the time the splash lifts.
  useEffect(() => {
    if (status !== "checking") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  if (status === "checking") {
    // Invisible under the native splash. On web the splash APIs are no-ops,
    // so this shows the brand background instead of the Welcome screen.
    return <View style={styles.loading} />;
  }

  if (status === "ready") {
    return <Redirect href="/(app)/dashboard" />;
  }

  if (status === "needs-onboarding") {
    return <Redirect href="/onboarding/name" />;
  }

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
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0B1120",
  },

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
});
