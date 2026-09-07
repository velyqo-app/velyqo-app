import { ScrollView, StyleSheet, Text, View } from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";
import { Colors, Spacing } from "../../constants/theme";
import { ReviewRow } from "../../hooks/useCareerCheckin";
import {
  ApplyStatus,
  CareerCheckinConfirmation,
} from "../../types/careerCheckinConfirmation";

interface Props {
  confirmation: CareerCheckinConfirmation;
  reviewRows: ReviewRow[];
  error: string | null;
  onRetry: () => void;
  /** True while a retry's applyCareerCheckinConfirmation call is in
   * flight — disables the Retry button and swaps its label, in addition
   * to (never instead of) useCareerCheckin's own submittingRef guard. */
  retrying: boolean;
}

const STATUS_LABEL: Record<ApplyStatus, string> = {
  applied: "Applied",
  failed: "Couldn't apply",
  pending: "Waiting",
};

/**
 * The resolved (non-in-flight) half of the Applying step — rendered once
 * applyCareerCheckinConfirmation has returned. Every status shown comes
 * directly from confirmation.decisions[].applyStatus, the backend's own
 * result — never a client-side guess at success (approved requirement 17).
 * The in-flight spinner itself is a plain LoadingScreen rendered by the
 * screen, not by this component — this file only ever renders once there
 * is a real result to show.
 */
export default function CheckinApplyStep({
  confirmation,
  reviewRows,
  error,
  onRetry,
  retrying,
}: Props) {
  const rowByIndex = new Map(reviewRows.map((row) => [row.reportIndex, row]));

  const applicable = confirmation.decisions.filter(
    (decision) => decision.decision === "confirmed" || decision.decision === "edited",
  );

  const failed = confirmation.status === "failed";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {failed ? "We couldn't finish everything" : "Applying your changes"}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {applicable.map((decision) => {
        const row = rowByIndex.get(decision.reportIndex);
        const label =
          (decision.decision === "edited" ? decision.appliedValue : null) ||
          row?.proposedDisplayValue ||
          row?.originalDescription ||
          "Change";

        return (
          <Card key={decision.reportIndex}>
            <View style={styles.itemRow}>
              <Text style={styles.itemLabel}>{label}</Text>

              <Text
                style={[
                  styles.itemStatus,
                  decision.applyStatus === "applied" && styles.itemStatusApplied,
                  decision.applyStatus === "failed" && styles.itemStatusFailed,
                ]}
              >
                {STATUS_LABEL[decision.applyStatus]}
              </Text>
            </View>
          </Card>
        );
      })}

      {failed && (
        <View style={styles.actions}>
          <Text style={styles.retryNote}>
            Everything that succeeded is saved. Retrying only attempts what
            didn&apos;t.
          </Text>

          <Button
            title={retrying ? "Retrying..." : "Retry"}
            onPress={onRetry}
            disabled={retrying}
          />
        </View>
      )}
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
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },

  error: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  itemLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    marginRight: Spacing.sm,
  },

  itemStatus: {
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: "700",
  },

  itemStatusApplied: {
    color: Colors.success,
  },

  itemStatusFailed: {
    color: Colors.danger,
  },

  actions: {
    marginTop: Spacing.md,
  },

  retryNote: {
    color: Colors.subtext,
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 19,
  },
});
