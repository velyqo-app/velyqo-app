import { router } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";

import { createJournalEntry } from "../../services/journalService";

import { Colors, Spacing } from "../../constants/theme";

import { getCurrentUser } from "../../services/authService";
import { completeMission } from "../../services/progressService";

/**
 * Plain module-level helper (no component state) so the two call sites
 * below — the mount effect and retry() — each own their own try/catch and
 * setState calls directly, rather than sharing a closure that captures
 * setState across an effect boundary.
 */
async function saveMissionProgress(): Promise<void> {
  const {
    data: { user },
  } = await getCurrentUser();

  if (!user) {
    return;
  }

  const { error: missionError } = await completeMission(user.id);

  if (missionError) {
    throw missionError;
  }

  const { error: journalError } = await createJournalEntry({
    userId: user.id,
    title: "Completed Today's Mission",
    description: "Successfully completed today's career mission.",
    entryType: "mission",
  });

  if (journalError) {
    throw journalError;
  }
}

export default function MissionCompleteScreen() {
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        await saveMissionProgress();

        setSaving(false);
      } catch (thrown) {
        // Either write can fail independently (a thrown network error, or a
        // returned Supabase error neither call throws on by itself) —
        // either way the user must see a real retry, not a spinner that
        // never resolves.
        console.warn("Mission completion failed:", thrown);

        setError(true);
        setSaving(false);
      }
    };

    run();
  }, []);

  const retry = () => {
    setSaving(true);
    setError(false);

    saveMissionProgress()
      .then(() => setSaving(false))
      .catch((thrown) => {
        console.warn("Mission completion retry failed:", thrown);

        setError(true);
        setSaving(false);
      });
  };

  if (saving) {
    return <LoadingScreen message="Saving your progress..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.errorTitle}>
              We couldn&apos;t save your progress
            </Text>

            <Text style={styles.errorText}>
              Please check your connection and try again.
            </Text>

            <View style={styles.buttonSpacing}>
              <Button title="Retry" onPress={retry} />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Text style={styles.badge}>MISSION COMPLETE</Text>

          <Text style={styles.title}>Nice work.</Text>

          <Text style={styles.subtitle}>
            You completed today&apos;s mission.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.metric}>Momentum increased</Text>

          <Text style={styles.metric}>Career readiness updated</Text>

          <Text style={styles.metric}>
            One step closer to your target career
          </Text>

          <View style={styles.buttonSpacing}>
            <Button
              title="Return to Career Brief"
              onPress={() => router.replace("/dashboard")}
            />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
  },

  content: {
    padding: Spacing.lg,
  },

  badge: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: Spacing.xs,
    fontSize: 15,
    lineHeight: 22,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },

  metric: {
    color: Colors.text,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },

  buttonSpacing: {
    marginTop: Spacing.lg,
  },

  errorTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  errorText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
});
