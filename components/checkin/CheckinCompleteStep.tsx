import { ScrollView, StyleSheet, Text, View } from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";
import { Colors, Spacing } from "../../constants/theme";
import { CheckinSummary } from "../../hooks/useCareerCheckin";

interface Props {
  summary: CheckinSummary;
  onReturnHome: () => void;
  returning: boolean;
}

/**
 * Deliberately restrained (approved requirement 18): no confetti, points,
 * streaks, or celebratory animation — just an honest statement of what
 * changed, what was added, and whether anything was left unresolved,
 * mirroring mission-complete.tsx's own plain, calm tone.
 */
export default function CheckinCompleteStep({
  summary,
  onReturnHome,
  returning,
}: Props) {
  const hasAnyChange = summary.profileChanges.length > 0 || summary.evidence.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.badge}>CHECK-IN COMPLETE</Text>

        <Text style={styles.title}>Thanks for the update.</Text>

        <View style={styles.divider} />

        {summary.profileChanges.map((change, index) => (
          <Text key={`profile-${index}`} style={styles.line}>
            {change.label} → {change.value}
          </Text>
        ))}

        {summary.evidence.map((item, index) => (
          <Text key={`evidence-${index}`} style={styles.line}>
            Added to your Career Journal: {item.description}
          </Text>
        ))}

        {!hasAnyChange && (
          <Text style={styles.line}>Your Career Journal has been updated.</Text>
        )}

        {summary.unresolvedCount > 0 && (
          <Text style={styles.unresolvedNote}>
            {summary.unresolvedCount === 1
              ? "One thing is still left unresolved — you can add detail next time you check in."
              : `${summary.unresolvedCount} things are still left unresolved — you can add detail next time you check in.`}
          </Text>
        )}
      </Card>

      <View style={styles.actions}>
        <Button
          title={returning ? "Returning..." : "Return to your Career Brief"}
          onPress={onReturnHome}
          disabled={returning}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
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
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },

  line: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 6,
  },

  unresolvedNote: {
    color: Colors.subtext,
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },

  actions: {
    marginTop: Spacing.lg,
  },
});
