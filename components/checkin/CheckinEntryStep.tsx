import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";
import { Colors, Spacing } from "../../constants/theme";

interface Props {
  onStart: () => void;
  onNoChange: () => void;
  disabled?: boolean;
  error: string | null;
}

/**
 * Phase 10.1 Step 8 — the entry state of the check-in flow. The secondary
 * "Nothing meaningful has changed" action is deliberately styled as a real,
 * quiet, tappable action — generous padding, plain text, no "x"/dismiss
 * iconography — so it reads as a genuine second answer to the question
 * being asked, never as skipping or dismissing a nag.
 */
export default function CheckinEntryStep({
  onStart,
  onNoChange,
  disabled,
  error,
}: Props) {
  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>
          Anything changed since we last checked in?
        </Text>

        <Text style={styles.subtitle}>
          A quick way to keep VELYQO up to date with your career.
        </Text>
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Button
          title="Yes, let's check in"
          onPress={onStart}
          disabled={disabled}
        />

        <TouchableOpacity
          style={styles.quietAction}
          onPress={onNoChange}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Nothing meaningful has changed"
        >
          <Text style={styles.quietActionText}>
            Nothing meaningful has changed
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },

  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },

  subtitle: {
    color: Colors.subtext,
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  error: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  actions: {
    marginTop: Spacing.xl,
  },

  quietAction: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },

  quietActionText: {
    color: Colors.subtext,
    fontSize: 15,
    fontWeight: "600",
  },
});
