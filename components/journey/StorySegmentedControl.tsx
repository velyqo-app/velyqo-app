import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors, Radius, Spacing } from "../../constants/theme";

export type JourneyViewMode = "roadmap" | "story";

interface Props {
  value: JourneyViewMode;
  onChange: (value: JourneyViewMode) => void;
}

const SEGMENTS: { value: JourneyViewMode; label: string }[] = [
  { value: "roadmap", label: "Roadmap" },
  { value: "story", label: "Story" },
];

/**
 * Phase 11 Step 4 — the one switch between "how do I get there" (Roadmap,
 * unchanged, default) and "how did I get here" (Story, new). Deliberately
 * a plain two-segment pill, not an animated slider — restrained, matching
 * the rest of Journey's visual language rather than adding decoration of
 * its own.
 */
export default function StorySegmentedControl({ value, onChange }: Props) {
  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
    >
      {SEGMENTS.map((segment) => {
        const selected = value === segment.value;

        return (
          <TouchableOpacity
            key={segment.value}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onChange(segment.value)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },

  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.sm,
  },

  segmentSelected: {
    backgroundColor: Colors.primary,
  },

  label: {
    color: Colors.subtext,
    fontSize: 15,
    fontWeight: "700",
  },

  labelSelected: {
    color: Colors.text,
  },
});
