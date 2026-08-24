import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

import { createJournalEntry } from "../../services/journalService";

import { Colors } from "../../constants/theme";

import { getCurrentUser } from "../../services/authService";
import { completeMission } from "../../services/progressService";

export default function MissionCompleteScreen() {
  const [saving, setSaving] = useState(true);

  useEffect(() => {
    const saveProgress = async () => {
      const {
        data: { user },
      } = await getCurrentUser();

      if (!user) {
        setSaving(false);
        return;
      }

      await completeMission(user.id);

      await createJournalEntry({
        userId: user.id,
        title: "Completed Today's Mission",
        description: "Successfully completed today's career mission.",
        entryType: "mission",
      });

      setSaving(false);
    };

    saveProgress();
  }, []);

  if (saving) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />

        <Text style={styles.loading}>Saving your progress...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Text style={styles.emoji}>🎉</Text>

          <Text style={styles.title}>Daily Win!</Text>

          <Text style={styles.subtitle}>
            Great job completing today&apos;s mission.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.metric}>🔥 Momentum Increased</Text>

          <Text style={styles.metric}>📈 Career Readiness Updated</Text>

          <Text style={styles.metric}>
            🚀 You&apos;re one step closer to your target career.
          </Text>

          <View style={{ marginTop: 30 }}>
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
    padding: 20,
  },

  emoji: {
    fontSize: 64,
    textAlign: "center",
  },

  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
  },

  subtitle: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 30,
  },

  metric: {
    color: Colors.text,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 14,
  },

  loading: {
    color: Colors.text,
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
