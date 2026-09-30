import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { ThemeColors } from "../../constants/theme";
import { useThemedStyles } from "../../context/ThemeContext";
import { CoachResponseSection } from "../../services/coachResponseParser";
import { DisclosureToggle, useDisclosure } from "../ui/Disclosure";

interface Props {
  sections: CoachResponseSection[];
}

/** Supporting reasoning — collapsed behind one "See reasoning" toggle so the
 * recommendation and the next move are what the user scans first. Every
 * other section (including an unlabelled lead-in) always stays visible. */
const REASONING_LABELS = new Set(["WHY IT MATTERS", "OPTIONS"]);

/**
 * Renders inside the existing AI ChatBubble in place of one flat paragraph —
 * same bubble background, no extra card — so structure comes from
 * typographic hierarchy alone, not another elevated surface.
 */
export default function StructuredCoachResponse({ sections }: Props) {
  const styles = useThemedStyles(createStyles);

  const { expanded, toggle } = useDisclosure();

  const hasNextMove = sections.some(
    (section) => section.label === "YOUR NEXT MOVE",
  );

  // Only collapse when something else stays visible — an answer made up
  // entirely of reasoning is shown whole rather than hidden behind a toggle.
  const collapsible = sections.some(
    (section) => !REASONING_LABELS.has(section.label),
  );

  const firstReasoningIndex = collapsible
    ? sections.findIndex((section) => REASONING_LABELS.has(section.label))
    : -1;

  // Sections keep their original order; reasoning ones are simply skipped
  // while collapsed.
  const visible = sections
    .map((section, index) => ({ section, index }))
    .filter(
      ({ section }) =>
        expanded || !collapsible || !REASONING_LABELS.has(section.label),
    );

  // The toggle sits where the reasoning is: before the first reasoning
  // section when open, or before whatever visibly follows it when closed —
  // so expanding reads exactly like the full answer did before. -1 means
  // "after the last section".
  const toggleBeforeIndex =
    firstReasoningIndex === -1
      ? null
      : expanded
        ? firstReasoningIndex
        : (visible.find(({ index }) => index > firstReasoningIndex)?.index ?? -1);

  const reasoningToggle = (
    <DisclosureToggle
      expanded={expanded}
      onPress={toggle}
      showLabel="See reasoning"
    />
  );

  return (
    <View>
      {visible.map(({ section, index }, position) => (
        <View key={`${section.label}-${index}`}>
          {index === toggleBeforeIndex && reasoningToggle}

          <View style={position > 0 ? styles.section : undefined}>
            {section.label ? (
              <Text style={styles.label}>{section.label}</Text>
            ) : null}

            <Text style={styles.body}>{section.body}</Text>
          </View>
        </View>
      ))}

      {toggleBeforeIndex === -1 && reasoningToggle}

      {hasNextMove && (
        <TouchableOpacity
          onPress={() => router.push("/timeline")}
          style={styles.link}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.linkText}>Back to your Journey ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    marginTop: 14,
  },

  label: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 6,
  },

  body: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  link: {
    marginTop: 14,
  },

  linkText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
