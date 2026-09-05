import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import { formatEstimatedJourney } from "../../services/journeyEstimateFormat";
import { RoadmapJourneyEstimate } from "../../types/roadmap";
import Card from "../ui/Card";

interface Props {
  currentRole: string;
  targetRole: string;
  progress: number;
  estimatedJourney: RoadmapJourneyEstimate | null;
  onPress: () => void;
}

/** A compact pointer to the full Journey — never the Journey itself. Whole
 * card opens the Journey tab; this must never trigger roadmap generation on
 * its own, since it only reads data useDashboard already loaded read-only. */
export default function JourneySummaryCard({
  currentRole,
  targetRole,
  progress,
  estimatedJourney,
  onPress,
}: Props) {
  const duration = formatEstimatedJourney(estimatedJourney);

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.label}>YOUR JOURNEY</Text>

        <Text style={styles.viewLink}>View Journey ›</Text>
      </View>

      <Text style={styles.roles}>
        {currentRole || "Current role"} → {targetRole || "Target role"}
      </Text>

      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.progressValue}>{progress}%</Text>
      </View>

      <Text style={styles.duration}>
        {duration
          ? `Estimated journey: approximately ${duration}`
          : "Generate your roadmap on Journey to see an estimate here."}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
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

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },

  progressValue: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: "700",
  },

  duration: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 12,
    lineHeight: 19,
  },
});
