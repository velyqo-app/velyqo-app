import { Redirect, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { getSession } from "../services/authService";
import { getProfile } from "../services/profileService";
import { Spacing, type ThemeColors } from "../constants/theme";
import { useThemedStyles } from "../context/ThemeContext";

type SessionStatus = "checking" | "signed-out" | "needs-onboarding" | "ready";

/** The Dynamic Growth V on true transparency (the launcher icon's adaptive
 * foreground) — no plate, so it sits cleanly on both theme backgrounds. */
const BRAND_MARK = require("../assets/brand/velyqo-adaptive-foreground.png");

// The asset is a 1024px square whose visible mark (V + glow) spans only its
// central ~46% x 41% — the rest is Android's launcher safe-zone padding.
const MARK_WIDTH_FRACTION = 0.457;
// Transparent padding above/below the mark (~29% each) is collapsed with
// negative margins, keeping a little room so the glow is never clipped.
const MARK_VERTICAL_PADDING_FRACTION = 0.27;

/**
 * Width of the visible mark: 44% of the screen width (comfortable side
 * margins on phones), but never more than 20% of the height (so short
 * screens keep room for the text and buttons), within 120-220dp.
 */
function brandMarkWidth(screenWidth: number, screenHeight: number) {
  return Math.min(220, Math.max(120, Math.min(screenWidth * 0.44, screenHeight * 0.2)));
}

export default function WelcomeScreen() {
  const styles = useThemedStyles(createStyles);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const markImageSize = brandMarkWidth(screenWidth, screenHeight) / MARK_WIDTH_FRACTION;

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
          const { data: profile, error } = await getProfile(session.user.id);

          if (error) {
            // supabase-js returns read failures here rather than throwing, so
            // this must be checked explicitly. A failed read is not the same
            // as "no profile": assume the user is onboarded so a transient
            // failure never pushes them back through onboarding and over
            // their saved answers.
            console.warn("Profile read failed, assuming onboarded:", error);

            hasProfile = true;
          } else {
            hasProfile = Boolean(profile?.target_role);
          }
        } catch (thrown) {
          // Backstop for a rejected request rather than a returned error.
          console.warn("Profile read threw, assuming onboarded:", thrown);

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
      <Image
        source={BRAND_MARK}
        resizeMode="contain"
        accessible={false}
        style={[
          styles.brandMark,
          {
            width: markImageSize,
            height: markImageSize,
            marginTop: -markImageSize * MARK_VERTICAL_PADDING_FRACTION,
            marginBottom: -markImageSize * MARK_VERTICAL_PADDING_FRACTION + Spacing.md,
          },
        ]}
      />

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

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    padding: 24,
  },

  brandMark: {
    alignSelf: "center",
  },

  logo: {
    color: Colors.primary,
    fontSize: 46,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 2,
  },

  tagline: {
    color: Colors.text,
    opacity: 0.8,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 60,
  },

  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },

  primaryText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
