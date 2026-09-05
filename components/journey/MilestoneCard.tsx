import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Radius, Shadows, Spacing } from "../../constants/theme";
import { RoadmapStep } from "../../types/roadmap";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Visual weight only — never the source of truth for where the user
 * actually is (that's MilestoneVisualState, purely date-derived). "next" is
 * a presentation-only nudge onto whichever upcoming milestone immediately
 * follows the current one, so the user's eye naturally continues forward. */
export type MilestoneEmphasis = "past" | "upcoming" | "next" | "current";

interface Props {
  step: RoadmapStep;
  emphasis: MilestoneEmphasis;

  /** "OCT 2026" etc., or null when the roadmap has no usable per-step
   * timing to anchor a date from. */
  dateLabel: string | null;

  /** The next step's title, or the target role's for the final milestone —
   * never invented, always the roadmap's own next entry. */
  unlocks: string;
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

export default function MilestoneCard({
  step,
  emphasis,
  dateLabel,
  unlocks,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    Boolean(step.description) ||
    step.skills.length > 0 ||
    step.actions.length > 0 ||
    Boolean(step.salary);

  const toggle = () => {
    if (!hasDetails) {
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  };

  const isPast = emphasis === "past";
  const isCurrent = emphasis === "current";
  const isNext = emphasis === "next";

  return (
    <View
      style={[
        styles.card,
        isCurrent && styles.cardCurrent,
        isNext && styles.cardNext,
        isPast && styles.cardPast,
      ]}
    >
      {isCurrent && (
        <LinearGradient
          colors={[Colors.highlight, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.7 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      <View style={styles.topRow}>
        {dateLabel ? (
          <Text style={[styles.date, isPast && styles.textQuiet]}>
            {dateLabel}
          </Text>
        ) : (
          <Text style={[styles.date, isPast && styles.textQuiet]}>
            STEP {step.order}
          </Text>
        )}

        {isCurrent && <Text style={styles.currentBadge}>CURRENT</Text>}
      </View>

      <Text style={[styles.title, isPast && styles.textQuiet]}>
        {step.title}
      </Text>

      {step.rationale ? (
        <Text
          style={[styles.rationale, isPast && styles.textQuiet]}
          numberOfLines={expanded ? undefined : 2}
        >
          {step.rationale}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {step.estimatedTime && (
          <Text style={[styles.meta, isPast && styles.textQuiet]}>
            ⏱ {step.estimatedTime}
          </Text>
        )}

        <Text
          style={[styles.meta, styles.metaUnlock, isPast && styles.textQuiet]}
          numberOfLines={1}
        >
          unlocks {unlocks}
        </Text>
      </View>

      {hasDetails && (
        <TouchableOpacity
          onPress={toggle}
          style={styles.expandRow}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.expandText}>
            {expanded ? "Show less" : "Show details"}
          </Text>
        </TouchableOpacity>
      )}

      {expanded && (
        <View style={styles.details}>
          {step.description ? (
            <Text style={styles.description}>{step.description}</Text>
          ) : null}

          {step.skills.length > 0 && (
            <View style={styles.chipRow}>
              {step.skills.map((skill) => (
                <View key={skill} style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                </View>
              ))}
            </View>
          )}

          {step.actions.length > 0 && (
            <View style={styles.actionBlock}>
              {step.actions.map((action) => (
                <Text key={action} style={styles.actionItem}>
                  • {action}
                </Text>
              ))}
            </View>
          )}

          {step.salary ? (
            <View style={styles.salaryBlock}>
              <Text style={styles.salaryLabel}>TYPICAL SALARY</Text>

              <Text style={styles.salaryValue}>
                {formatMoney(step.salary.currency, step.salary.median)}
              </Text>

              <Text style={styles.salaryRange}>
                {formatMoney(step.salary.currency, step.salary.low)} –{" "}
                {formatMoney(step.salary.currency, step.salary.high)}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    overflow: "hidden",
  },

  cardCurrent: {
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.borderElevated,
    ...Shadows.card,
  },

  cardNext: {
    ...Shadows.card,
    shadowOpacity: 0.14,
  },

  cardPast: {
    opacity: 0.55,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  date: {
    color: Colors.subtext,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },

  currentBadge: {
    color: Colors.primary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
  },

  title: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
  },

  rationale: {
    color: Colors.subtext,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  textQuiet: {
    color: Colors.subtext,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 14,
  },

  meta: {
    color: Colors.subtext,
    fontSize: 12,
  },

  metaUnlock: {
    flexShrink: 1,
    fontStyle: "italic",
  },

  expandRow: {
    marginTop: 10,
  },

  expandText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  description: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  chip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },

  chipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "600",
  },

  actionBlock: {
    marginBottom: 10,
  },

  actionItem: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
  },

  salaryBlock: {
    marginTop: 4,
  },

  salaryLabel: {
    color: Colors.subtext,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 4,
  },

  salaryValue: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: "800",
  },

  salaryRange: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: 2,
  },
});
