import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import Card from "../ui/Card";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ReviewRow } from "../../hooks/useCareerCheckin";
import { CapabilityGap } from "../../types/capability";
import { CareerCheckinDecisionType } from "../../types/careerCheckinConfirmation";

interface Props {
  row: ReviewRow;
  capabilityOptions: CapabilityGap[];
  onChange: (patch: Partial<ReviewRow>) => void;
}

const DECISION_LABEL: Record<CareerCheckinDecisionType, string> = {
  confirmed: "Confirmed",
  edited: "Edited",
  declined: "Declined",
  unresolved: "Left unresolved",
};

/**
 * Phase 10.1 Step 8 — the single most important piece of UI in the flow.
 * Renders one of two shapes, normalized by useCareerCheckin into the same
 * ReviewRow type so this component never special-cases which:
 *
 * - A deterministic proposal: "You told us" / "You told us" / "VELYQO
 *   proposes" + a quiet provenance line, with Confirm/Edit/Decline.
 * - An unresolved report: "You told us" + an honest "we need more"
 *   message, with a field to supply a value OR an explicit "Leave
 *   unresolved" action — never a Decline button, since declining implies
 *   VELYQO understood a proposal it never actually produced here.
 *
 * `source: "ai_suggested"` is rendered distinctly (a visibly less
 * authoritative tone) even though Step 8 never produces it today — Step 6
 * only ever emits "user_reported" — so the component is forward-compatible
 * without any AI being added now.
 */
export default function CheckinReviewCard({ row, capabilityOptions, onChange }: Props) {
  const isEvidence = row.category === "new_evidence";

  if (row.isUnresolved) {
    return (
      <Card>
        <Text style={styles.eyebrow}>YOU TOLD US</Text>
        <Text style={styles.body}>{row.originalDescription}</Text>

        <View style={styles.divider} />

        <Text style={styles.unresolvedNote}>
          We don&apos;t have enough to go on here. Add a detail if you&apos;d
          like, or leave it as-is.
        </Text>

        <TextInput
          style={styles.input}
          value={row.editedValue}
          onChangeText={(text) =>
            onChange({
              editedValue: text,
              decision: text.trim().length > 0 ? "edited" : null,
            })
          }
          placeholder="e.g. Engineering Team Lead"
          placeholderTextColor={Colors.subtext}
          returnKeyType="done"
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              row.decision === "unresolved" && styles.actionButtonActive,
            ]}
            onPress={() => onChange({ decision: "unresolved", editedValue: "" })}
            accessibilityRole="button"
            accessibilityState={{ selected: row.decision === "unresolved" }}
          >
            <Text
              style={[
                styles.actionText,
                row.decision === "unresolved" && styles.actionTextActive,
              ]}
            >
              Leave unresolved
            </Text>
          </TouchableOpacity>
        </View>

        {row.decision && (
          <Text style={styles.statusLabel}>{DECISION_LABEL[row.decision]}</Text>
        )}
      </Card>
    );
  }

  const displayedProposedValue =
    row.decision === "edited" && row.editedValue
      ? row.editedValue
      : row.proposedDisplayValue;

  return (
    <Card>
      <Text style={styles.eyebrow}>YOU TOLD US</Text>
      <Text style={styles.body}>{row.originalDescription}</Text>

      <View style={styles.divider} />

      <Text style={styles.eyebrow}>VELYQO PROPOSES</Text>
      <Text style={styles.proposedValue}>{displayedProposedValue}</Text>
      <Text style={styles.provenance}>
        {row.source === "ai_suggested"
          ? "AI suggestion — please review."
          : "From what you told us."}
      </Text>

      {row.decision === "edited" && (
        <TextInput
          style={styles.input}
          value={row.editedValue}
          onChangeText={(text) => onChange({ editedValue: text })}
          placeholder="Edit the proposed value"
          placeholderTextColor={Colors.subtext}
          returnKeyType="done"
        />
      )}

      {isEvidence && (row.decision === "confirmed" || row.decision === "edited") && (
        <View style={styles.chipSection}>
          <Text style={styles.fieldLabel}>Link to a capability (optional)</Text>

          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, row.capabilityGapId === null && styles.chipSelected]}
              onPress={() => onChange({ capabilityGapId: null })}
              accessibilityRole="button"
              accessibilityState={{ selected: row.capabilityGapId === null }}
            >
              <Text
                style={[
                  styles.chipText,
                  row.capabilityGapId === null && styles.chipTextSelected,
                ]}
              >
                Not linked to a specific capability
              </Text>
            </TouchableOpacity>

            {capabilityOptions.map((capability) => (
              <TouchableOpacity
                key={capability.id}
                style={[
                  styles.chip,
                  row.capabilityGapId === capability.id && styles.chipSelected,
                ]}
                onPress={() => onChange({ capabilityGapId: capability.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: row.capabilityGapId === capability.id }}
              >
                <Text
                  style={[
                    styles.chipText,
                    row.capabilityGapId === capability.id && styles.chipTextSelected,
                  ]}
                >
                  {capability.capability_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            row.decision === "confirmed" && styles.actionButtonActive,
          ]}
          onPress={() => onChange({ decision: "confirmed", editedValue: "" })}
          accessibilityRole="button"
          accessibilityState={{ selected: row.decision === "confirmed" }}
        >
          <Text
            style={[
              styles.actionText,
              row.decision === "confirmed" && styles.actionTextActive,
            ]}
          >
            Confirm
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            row.decision === "edited" && styles.actionButtonActive,
          ]}
          onPress={() =>
            onChange({
              decision: "edited",
              editedValue: row.editedValue || row.proposedDisplayValue || "",
            })
          }
          accessibilityRole="button"
          accessibilityState={{ selected: row.decision === "edited" }}
        >
          <Text
            style={[
              styles.actionText,
              row.decision === "edited" && styles.actionTextActive,
            ]}
          >
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            row.decision === "declined" && styles.actionButtonActive,
          ]}
          onPress={() =>
            onChange({ decision: "declined", editedValue: "", capabilityGapId: null })
          }
          accessibilityRole="button"
          accessibilityState={{ selected: row.decision === "declined" }}
        >
          <Text
            style={[
              styles.actionText,
              row.decision === "declined" && styles.actionTextActive,
            ]}
          >
            Decline
          </Text>
        </TouchableOpacity>
      </View>

      {row.decision && (
        <Text style={styles.statusLabel}>{DECISION_LABEL[row.decision]}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  body: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  proposedValue: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 6,
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },

  unresolvedNote: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },

  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginTop: Spacing.sm,
  },

  fieldLabel: {
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },

  chipSection: {
    marginTop: Spacing.md,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  chipText: {
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: "600",
  },

  chipTextSelected: {
    color: Colors.text,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.lg,
  },

  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },

  actionButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  actionText: {
    color: Colors.subtext,
    fontSize: 14,
    fontWeight: "700",
  },

  actionTextActive: {
    color: Colors.text,
  },

  statusLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
