import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Card from "../ui/Card";
import ProvenanceBadge from "./ProvenanceBadge";
import { Colors, Spacing } from "../../constants/theme";
import { CheckinItem, JourneyEvent } from "../../types/careerJourney";

/**
 * Phase 11 Step 4 — one shared card, type-specific rendering internally.
 * Deliberately one component rather than four divergent ones, so every
 * event in Story reads as the same visual language.
 */

interface Props {
  event: JourneyEvent;
  onCapabilityPress: (capabilityGapId: string, capabilityName: string) => void;
}

/** Plain, existing-convention date formatting — matches career-journal.tsx's
 * own `new Date(entry.created_at).toLocaleDateString()`, not a new scheme. */
export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/**
 * The exact five-way (plus null) honest label for one check-in report —
 * exported for direct unit testing. Never returns anything implying
 * VELYQO verified a self-reported claim; that distinction lives entirely
 * in the card's own provenance badge (always "You reported" for a whole
 * checkin_submitted event), never here.
 */
export interface CheckinItemDisplay {
  /** Null only for "no_change", which has nothing to decide. */
  decisionLabel: string | null;
  text: string;
  muted: boolean;
}

export function describeCheckinItem(item: CheckinItem): CheckinItemDisplay {
  if (item.category === "no_change") {
    return { decisionLabel: null, text: "No changes reported", muted: true };
  }

  if (item.decision === "confirmed") {
    return {
      decisionLabel: "Confirmed",
      text: item.appliedValue ?? item.description,
      muted: false,
    };
  }

  if (item.decision === "edited") {
    return {
      decisionLabel: "Edited",
      text: item.appliedValue ?? item.description,
      muted: false,
    };
  }

  if (item.decision === "declined") {
    return { decisionLabel: "Declined", text: item.description, muted: true };
  }

  if (item.decision === "unresolved") {
    return {
      decisionLabel: "Left unresolved",
      text: item.description,
      muted: true,
    };
  }

  // decision === null on an actionable report — never reviewed/applied.
  return {
    decisionLabel: "Not yet reviewed",
    text: item.description,
    muted: true,
  };
}

function CapabilityChip({
  capabilityGapId,
  capabilityName,
  onPress,
}: {
  capabilityGapId: string;
  capabilityName: string;
  onPress: (capabilityGapId: string, capabilityName: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => onPress(capabilityGapId, capabilityName)}
      accessibilityRole="button"
      accessibilityLabel={`View evidence for ${capabilityName}`}
    >
      <Text style={styles.chipText}>{capabilityName}</Text>
      <Text style={styles.chipChevron}>›</Text>
    </TouchableOpacity>
  );
}

function MissionCard({
  event,
  onCapabilityPress,
}: {
  event: Extract<JourneyEvent, { type: "mission_completed" }>;
  onCapabilityPress: Props["onCapabilityPress"];
}) {
  return (
    <Card>
      <View style={styles.headerRow}>
        <ProvenanceBadge variant="velyqo_verified" />
        <Text style={styles.date}>{formatEventDate(event.date)}</Text>
      </View>

      <Text style={styles.title}>{event.title}</Text>

      {event.description ? (
        <Text style={styles.description}>{event.description}</Text>
      ) : null}

      {event.capabilityGapId && event.capabilityName ? (
        <CapabilityChip
          capabilityGapId={event.capabilityGapId}
          capabilityName={event.capabilityName}
          onPress={onCapabilityPress}
        />
      ) : null}
    </Card>
  );
}

function CheckinCard({
  event,
  onCapabilityPress,
}: {
  event: Extract<JourneyEvent, { type: "checkin_submitted" }>;
  onCapabilityPress: Props["onCapabilityPress"];
}) {
  return (
    <Card>
      <View style={styles.headerRow}>
        <ProvenanceBadge variant="you_reported" />
        <Text style={styles.date}>{formatEventDate(event.date)}</Text>
      </View>

      {event.items.map((item, index) => {
        const display = describeCheckinItem(item);

        return (
          <View key={index} style={styles.checkinItem}>
            <View style={styles.checkinItemRow}>
              <Text
                style={[
                  styles.checkinItemText,
                  display.muted && styles.checkinItemTextMuted,
                ]}
              >
                {display.text}
              </Text>

              {display.decisionLabel ? (
                <Text style={styles.decisionLabel}>{display.decisionLabel}</Text>
              ) : null}
            </View>

            {item.capabilityGapId && item.capabilityName ? (
              <CapabilityChip
                capabilityGapId={item.capabilityGapId}
                capabilityName={item.capabilityName}
                onPress={onCapabilityPress}
              />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

function MinimalCard({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  return (
    <Card>
      <View style={styles.headerRowCompact}>
        <ProvenanceBadge variant="you_reported" />
      </View>

      <Text style={styles.minimalTitle}>{title}</Text>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </Card>
  );
}

export default function StoryEventCard({ event, onCapabilityPress }: Props) {
  if (event.type === "mission_completed") {
    return <MissionCard event={event} onCapabilityPress={onCapabilityPress} />;
  }

  if (event.type === "checkin_submitted") {
    return <CheckinCard event={event} onCapabilityPress={onCapabilityPress} />;
  }

  // profile_edited and generic_journal_entry share the same minimal shape.
  return (
    <View>
      <MinimalCard title={event.title} description={event.description} />
      <Text style={styles.dateBelowMinimal}>{formatEventDate(event.date)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },

  headerRowCompact: {
    marginBottom: 6,
  },

  date: {
    color: Colors.subtext,
    fontSize: 12,
  },

  dateBelowMinimal: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },

  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  minimalTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },

  description: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  checkinItem: {
    marginTop: Spacing.sm,
  },

  checkinItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  checkinItemText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginRight: Spacing.sm,
  },

  checkinItemTextMuted: {
    color: Colors.subtext,
  },

  decisionLabel: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },

  chipText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "600",
  },

  chipChevron: {
    color: Colors.subtext,
    fontSize: 15,
    marginLeft: 4,
  },
});
