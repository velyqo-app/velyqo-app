import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing } from "../../constants/theme";

interface Props {
  step: number;
  total: number;
}

/** A restrained progress bar + "Step X of Y" label, shared across every
 * onboarding screen so the flow reads as one continuous, premium sequence
 * rather than a set of disconnected forms — the same role Journey's sticky
 * date indicator plays for the main app. Purely presentational: never
 * changes question order or skip logic, just reflects the step the caller
 * already computed. */
export default function OnboardingProgress({ step, total }: Props) {
  const progress = Math.min(1, Math.max(0, step / total));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.label}>
        STEP {step} OF {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },

  track: {
    height: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
  },

  label: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
  },
});
