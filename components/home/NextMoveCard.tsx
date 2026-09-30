import { StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../../constants/theme";
import { useThemedStyles } from "../../context/ThemeContext";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { DisclosureToggle, ExpandableText, useDisclosure } from "../ui/Disclosure";

interface Props {
  title: string;
  description: string;
  /** Absent for a NextMove with no mission attached (needs_destination /
   * up_to_date) — the time row is skipped entirely rather than showing a
   * blank or fabricated duration. */
  estimatedTime?: string;
  /** Defaults to "▶ Start" for a real mission. A caller representing a
   * non-mission NextMove (e.g. "Set destination", "View Journey") should
   * pass an explicit, honest label instead. */
  actionLabel?: string;
  /** Why this move matters — supporting reasoning, revealed together with
   * the full description under "Show details" (formerly its own card). */
  reason?: string;
  onStart: () => void;
}

/** Collapsed description length — enough to say what the move is about;
 * the rest of the generated text is one tap away, never rewritten. */
const SUMMARY_LINES = 2;

/** The dominant element on Home — deliberately the largest, most visually
 * weighted section on the screen, per "the user should know the primary
 * action immediately." The whole card starts the mission, not just the
 * button — tapping the button also fires the same handler (React Native
 * gives the touch to whichever element is deepest, so this never double
 * fires), matching the "whole cards tappable" principle while still giving
 * a clear, explicit call-to-action for anyone scanning for a button. */
export default function NextMoveCard({
  title,
  description,
  estimatedTime,
  actionLabel = "▶ Start",
  reason,
  onStart,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const { expanded, toggle } = useDisclosure();

  // "Never hide the action, hide the explanation": title, a short summary,
  // the time and Start always stay visible; only the rest of the generated
  // description and the "why" sit behind the toggle. The toggle is its own
  // touch target, so opening details never starts the mission.
  return (
    <Card onPress={onStart}>
      <Text style={styles.label}>YOUR NEXT MOVE</Text>

      <Text style={styles.title}>{title}</Text>

      {reason ? (
        <>
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : SUMMARY_LINES}
          >
            {description}
          </Text>

          <DisclosureToggle expanded={expanded} onPress={toggle} />

          {expanded && (
            <View style={styles.details}>
              <Text style={styles.reasonLabel}>WHY THIS MATTERS</Text>

              <Text style={styles.reason}>{reason}</Text>
            </View>
          )}
        </>
      ) : (
        <ExpandableText
          text={description}
          numberOfLines={SUMMARY_LINES}
          style={styles.description}
        />
      )}

      {estimatedTime ? (
        <View style={styles.footer}>
          <Text style={styles.time}>⏱ {estimatedTime}</Text>
        </View>
      ) : null}

      <View style={styles.buttonSpacing}>
        <Button title={actionLabel} onPress={onStart} />
      </View>
    </Card>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  label: {
    color: Colors.primary,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 10,
  },

  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },

  description: {
    color: Colors.subtext,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },

  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  reasonLabel: {
    color: Colors.subtext,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 6,
  },

  reason: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  footer: {
    marginTop: 16,
  },

  time: {
    color: Colors.subtext,
    fontSize: 14,
    fontWeight: "600",
  },

  buttonSpacing: {
    marginTop: 20,
  },
});
