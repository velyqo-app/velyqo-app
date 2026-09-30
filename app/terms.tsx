import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Spacing, type ThemeColors } from "../constants/theme";
import { useThemedStyles } from "../context/ThemeContext";

/**
 * Phase 18 — a simple, MVP-appropriate Terms of Service. Reachable from
 * both Signup (pre-account) and Profile (post-account) — a plain, top-level
 * Stack route (app/_layout.tsx) rather than a Tabs.Screen, so it works
 * correctly regardless of auth state and gets a normal Stack back
 * (swipe-back on iOS, hardware back on Android) for free.
 *
 * Deliberately plain text, not a legal document — this is a placeholder
 * meant to be replaced with reviewed legal copy before a real public
 * launch, and is written to make that swap easy (one file, no logic).
 */
export default function TermsScreen() {
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated: September 2026</Text>

        <Text style={styles.paragraph}>
          These terms are a simple, plain-language summary for the current
          version of VELYQO. Please read them before creating an account or
          using the app.
        </Text>

        <Text style={styles.heading}>What VELYQO is</Text>
        <Text style={styles.paragraph}>
          VELYQO helps you understand your career, identify capability gaps
          for a target role, and take practical steps toward it — including
          missions, a roadmap, and an AI Career Coach you can talk to.
        </Text>

        <Text style={styles.heading}>Not professional advice</Text>
        <Text style={styles.paragraph}>
          VELYQO provides career guidance and information for your own
          consideration. It is not regulated financial, legal, employment,
          or career-counselling advice, and it does not guarantee any
          outcome — including a job offer, a promotion, a salary change, or
          a specific timeline. Decisions about your career remain yours to
          make.
        </Text>

        <Text style={styles.heading}>AI features</Text>
        <Text style={styles.paragraph}>
          Some features (like Coach) use artificial intelligence to respond
          to questions you ask and to help plan missions. AI responses are
          generated based on the information you have provided in the app
          and are not verified facts — treat them as a starting point, not a
          final answer.
        </Text>

        <Text style={styles.heading}>Your account</Text>
        <Text style={styles.paragraph}>
          You are responsible for the accuracy of the information you enter
          and for keeping your account credentials secure. You can update
          your information at any time from Profile, and you can delete
          your account and its data at any time from Profile → Delete
          Account.
        </Text>

        <Text style={styles.heading}>Service &quot;as is&quot;</Text>
        <Text style={styles.paragraph}>
          VELYQO is provided as-is, without warranties of any kind. We do
          not guarantee the service will always be available, error-free, or
          uninterrupted, and features may change as the product develops.
        </Text>

        <Text style={styles.heading}>Changes to these terms</Text>
        <Text style={styles.paragraph}>
          We may update these terms as VELYQO develops. Continuing to use
          the app after an update means you accept the current version.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.paragraph}>
          Questions about these terms can be sent to{" "}
          <Text style={styles.link}>support@velyqoapp.com</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  back: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: Spacing.sm,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
  },

  updated: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },

  heading: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },

  paragraph: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 21,
  },

  link: {
    color: Colors.primary,
    fontWeight: "600",
  },
});
