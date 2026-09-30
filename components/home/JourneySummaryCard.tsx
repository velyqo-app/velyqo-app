import { StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../../constants/theme";
import { useThemedStyles } from "../../context/ThemeContext";
import { CapabilityMilestoneEvent } from "../../services/capabilityDevelopmentTimelineService";
import { formatEstimatedJourney } from "../../services/journeyEstimateFormat";
import { RoadmapJourneyEstimate } from "../../types/roadmap";
import Card from "../ui/Card";

interface Props {
  currentRole: string;
  targetRole: string;
  estimatedJourney: RoadmapJourneyEstimate | null;
  /** Phase 17B — the single most recent Capability Development Timeline
   * milestone (Phase 16, unmodified) for the CURRENT target role, or null
   * when none exists. When present, replaces this card's own static
   * estimated-journey caption with this dated fact; when null (no
   * milestone yet, no target role, or the read failed), the caption falls
   * back to today's existing estimated-journey text exactly as before —
   * never an empty state, never invented filler. */
  recentCapabilityMilestone?: CapabilityMilestoneEvent | null;
  onPress: () => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "D Month YYYY" (e.g. "12 September 2026") — parsed directly from the ISO
 * string's own year/month/day components, never `Date`/
 * `toLocaleDateString()` (locale/timezone-sensitive). Mirrors
 * promptBuilderService.ts's own formatMilestoneDate exactly (same
 * algorithm, same output), reimplemented here rather than imported since
 * that function is private to the prompt-building layer and this is a UI
 * concern — a display formatter, not a second definition of what a
 * milestone is or how one is reconstructed (that remains entirely owned by
 * capabilityDevelopmentTimelineService, unmodified).
 */
function formatMilestoneDate(iso: string): string {
  const year = iso.slice(0, 4);
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));

  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** A compact pointer to the full Journey — never the Journey itself. Whole
 * card opens the Journey tab; this must never trigger roadmap generation on
 * its own, since it only reads data useDashboard already loaded read-only. */
export default function JourneySummaryCard({
  currentRole,
  targetRole,
  estimatedJourney,
  recentCapabilityMilestone,
  onPress,
}: Props) {
  const styles = useThemedStyles(createStyles);

  const duration = formatEstimatedJourney(estimatedJourney);

  // Phase 17B — a real, dated fact takes priority over the static estimate
  // when one exists; otherwise this card behaves exactly as it did before
  // this phase. Independently stated, exactly the approved Phase 16
  // wording — no elapsed time, no pace/judgment language.
  const caption = recentCapabilityMilestone
    ? `${recentCapabilityMilestone.capabilityName} reached a ${recentCapabilityMilestone.milestone} level on ${formatMilestoneDate(recentCapabilityMilestone.reachedAt)}.`
    : duration
      ? `Estimated journey: approximately ${duration}`
      : "Generate your roadmap on Journey to see an estimate here.";

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.label}>YOUR JOURNEY</Text>

        <Text style={styles.viewLink}>View Journey ›</Text>
      </View>

      <Text style={styles.roles}>
        {currentRole || "Current role"} → {targetRole || "Target role"}
      </Text>

      <Text style={styles.duration}>{caption}</Text>
    </Card>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  label: {
    color: Colors.subtext,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
  },

  viewLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  roles: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },

  duration: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 12,
    lineHeight: 19,
  },
});
