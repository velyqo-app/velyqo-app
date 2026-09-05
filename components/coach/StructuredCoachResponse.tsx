import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "../../constants/theme";
import { CoachResponseSection } from "../../services/coachResponseParser";

interface Props {
  sections: CoachResponseSection[];
}

/**
 * Renders inside the existing AI ChatBubble in place of one flat paragraph —
 * same bubble background, no extra card — so structure comes from
 * typographic hierarchy alone, not another elevated surface.
 */
export default function StructuredCoachResponse({ sections }: Props) {
  const hasNextMove = sections.some(
    (section) => section.label === "YOUR NEXT MOVE",
  );

  return (
    <View>
      {sections.map((section, index) => (
        <View
          key={`${section.label}-${index}`}
          style={index > 0 ? styles.section : undefined}
        >
          {section.label ? (
            <Text style={styles.label}>{section.label}</Text>
          ) : null}

          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}

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

const styles = StyleSheet.create({
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
