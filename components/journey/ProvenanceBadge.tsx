import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius } from "../../constants/theme";

/**
 * Phase 11 Step 4 — the one small reusable label for "who supplied this":
 * reused across Story event cards and the Capability Evidence screen so the
 * same three concepts always read identically wherever they appear.
 *
 * "assessment" is a third, Trail-only variant — VELYQO's own derived
 * conclusion from evidence, distinct from either "you_reported" (the
 * evidence itself) or "velyqo_verified" (mission evidence) — see
 * types/careerJourney.ts's JourneyEventProvenance for the two reused there.
 *
 * The label TEXT alone fully conveys meaning — colour is a secondary
 * reinforcement, never the only signal (a screen reader reads the text
 * regardless of colour).
 *
 * Phase 13 — the "velyqo_verified" variant's own label was corrected from
 * "VELYQO verified" to "Completed via VELYQO": VELYQO only knows a mission
 * was completed in-app, never that the underlying real-world skill was
 * independently verified, and the word "verified" overstated that. The
 * variant KEY is unchanged (still "velyqo_verified", still reused verbatim
 * from JourneyEventProvenance) — this is a wording-only fix, not a new
 * provenance value.
 */
export type ProvenanceBadgeVariant = "you_reported" | "velyqo_verified" | "assessment";

interface Props {
  variant: ProvenanceBadgeVariant;
}

const LABELS: Record<ProvenanceBadgeVariant, string> = {
  you_reported: "You reported",
  velyqo_verified: "Completed via VELYQO",
  assessment: "VELYQO's assessment",
};

export default function ProvenanceBadge({ variant }: Props) {
  return (
    <View
      style={[
        styles.badge,
        variant === "velyqo_verified" && styles.verified,
        variant === "assessment" && styles.assessment,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "velyqo_verified" && styles.verifiedText,
          variant === "assessment" && styles.assessmentText,
        ]}
      >
        {LABELS[variant]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "transparent",
  },

  verified: {
    borderColor: Colors.success,
  },

  assessment: {
    borderColor: Colors.primary,
  },

  text: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  verifiedText: {
    color: Colors.success,
  },

  assessmentText: {
    color: Colors.primary,
  },
});
