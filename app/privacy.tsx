import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Spacing } from "../constants/theme";

/**
 * Phase 18 — a simple, MVP-appropriate Privacy Policy. Reachable from both
 * Signup (pre-account) and Profile (post-account) — see terms.tsx's own
 * header comment for why this is a plain, top-level Stack route rather
 * than a Tabs.Screen.
 *
 * Deliberately plain text, not a legal document — a placeholder meant to
 * be replaced with reviewed legal copy before a real public launch, and
 * written to make that swap easy (one file, no logic).
 */
export default function PrivacyScreen() {
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
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: September 2026</Text>

        <Text style={styles.paragraph}>
          This is a plain-language summary of what VELYQO collects and how
          it is used for the current version of the app.
        </Text>

        <Text style={styles.heading}>What we collect</Text>
        <Text style={styles.paragraph}>
          • Account information: your email address and password (your
          password is never visible to us — it is handled directly by our
          authentication provider).{"\n\n"}
          • Career information you provide: your current and target role,
          salary figures, experience, education, skills, country, and
          career goals.{"\n\n"}
          • Your activity in the app: missions you complete, check-ins, and
          the questions and messages you send to Coach.
        </Text>

        <Text style={styles.heading}>How we use it</Text>
        <Text style={styles.paragraph}>
          We use this information to power VELYQO&apos;s own features for
          you — your capability gaps, roadmap, missions, and Coach
          conversations. When you use an AI feature such as Coach, the
          relevant information you have provided is sent to our AI
          provider (OpenAI) solely to generate a response to you. It is not
          used to train the AI provider&apos;s models on our behalf.
        </Text>

        <Text style={styles.heading}>Where it&apos;s stored</Text>
        <Text style={styles.paragraph}>
          Your data is stored securely with our hosting and database
          provider, Supabase. We do not sell your information, and we do
          not share it with advertisers.
        </Text>

        <Text style={styles.heading}>Your choices</Text>
        <Text style={styles.paragraph}>
          You can review and update most of your information at any time
          from Profile. You can permanently delete your account and all of
          the data described above at any time from Profile → Delete
          Account.
        </Text>

        <Text style={styles.heading}>Not regulated advice</Text>
        <Text style={styles.paragraph}>
          VELYQO provides career guidance and information, not regulated
          financial, legal, or career-counselling advice — see our Terms of
          Service for more detail.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.paragraph}>
          Questions about this policy or your data can be sent to{" "}
          <Text style={styles.link}>support@velyqoapp.com</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
