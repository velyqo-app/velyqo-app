import { ScrollView, StyleSheet, Text, View } from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";
import { Colors, Spacing } from "../../constants/theme";
import { CheckinSummary } from "../../hooks/useCareerCheckin";

interface Props {
  summary: CheckinSummary;
  onApply: () => void;
  submitting: boolean;
  error: string | null;
}

/**
 * Shown once saveCareerCheckinConfirmation has already succeeded — the
 * decisions are locked in (Step 7.1's write-once `decisions` column), so
 * this screen never offers an in-place "Back to Review" (there is nothing
 * left to re-edit). Leaving from here is handled by the screen-level
 * navigation warning, not an in-screen button.
 */
export default function CheckinSummaryStep({
  summary,
  onApply,
  submitting,
  error,
}: Props) {
  const hasAnyChange = summary.profileChanges.length > 0 || summary.evidence.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Here&apos;s what will happen</Text>

      {summary.profileChanges.length > 0 && (
        <Card>
          <Text style={styles.sectionLabel}>PROFILE CHANGES</Text>

          {summary.profileChanges.map((change, index) => (
            <Text key={index} style={styles.line}>
              {change.label} → {change.value}
            </Text>
          ))}
        </Card>
      )}

      {summary.evidence.length > 0 && (
        <Card>
          <Text style={styles.sectionLabel}>NEW EVIDENCE</Text>

          {summary.evidence.map((item, index) => (
            <View key={index} style={styles.evidenceRow}>
              <Text style={styles.line}>{item.description}</Text>

              <Text style={styles.evidenceCapability}>
                {item.capabilityName
                  ? `Linked to: ${item.capabilityName}`
                  : "Not linked to a specific capability"}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Text style={styles.sectionLabel}>CAREER JOURNAL</Text>
        <Text style={styles.line}>
          This check-in will be added to your Career Journal.
        </Text>
      </Card>

      {!hasAnyChange && (
        <Text style={styles.emptyNote}>
          Nothing will be applied to your profile — only your Career Journal
          entry.
        </Text>
      )}

      {(summary.declinedCount > 0 || summary.unresolvedCount > 0) && (
        <Text style={styles.footnote}>
          {[
            summary.declinedCount > 0 ? `${summary.declinedCount} declined` : null,
            summary.unresolvedCount > 0
              ? `${summary.unresolvedCount} left unresolved`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          {" — not applied."}
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Button
          title={submitting ? "Applying..." : "Save & apply"}
          onPress={onApply}
          disabled={submitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },

  sectionLabel: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },

  line: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  evidenceRow: {
    marginBottom: Spacing.sm,
  },

  evidenceCapability: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: 2,
  },

  emptyNote: {
    color: Colors.subtext,
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },

  footnote: {
    color: Colors.subtext,
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  error: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  actions: {
    marginTop: Spacing.lg,
  },
});
