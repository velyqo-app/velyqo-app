import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors, Radius, Shadows, Spacing } from "../../constants/theme";
import { formatEstimatedJourney } from "../../services/journeyEstimateFormat";
import { RoadmapJourneyEstimate } from "../../types/roadmap";

interface Props {
  loading: boolean;
  hasRoadmap: boolean;
  missionTitle: string;
  estimatedJourney: RoadmapJourneyEstimate | null;
  onViewJourney: () => void;
}

/**
 * One of the few elevated surfaces on this screen — Coach's equivalent of
 * Journey's "current milestone" emphasis, reused here rather than invented
 * fresh. `estimatedJourney` is formatted with the exact same shared helper
 * Home and Journey use, so this can never show a number that disagrees with
 * either of them.
 */
export default function CurrentFocusCard({
  loading,
  hasRoadmap,
  missionTitle,
  estimatedJourney,
  onViewJourney,
}: Props) {
  if (loading) {
    return null;
  }

  const duration = formatEstimatedJourney(estimatedJourney);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>CURRENT FOCUS</Text>

      <Text style={styles.title}>{missionTitle}</Text>

      {hasRoadmap ? (
        duration && (
          <Text style={styles.meta}>
            Estimated journey: approximately {duration}
          </Text>
        )
      ) : (
        <Text style={styles.fallback}>
          Add a target role and generate your roadmap on Journey to get a
          focus that&apos;s tailored to your own path.
        </Text>
      )}

      <TouchableOpacity
        onPress={onViewJourney}
        style={styles.link}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.linkText}>
          {hasRoadmap ? "View your Journey" : "Open your Journey"} ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },

  label: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  title: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },

  meta: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 8,
  },

  fallback: {
    color: Colors.subtext,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  link: {
    marginTop: 14,
    alignSelf: "flex-start",
  },

  linkText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
