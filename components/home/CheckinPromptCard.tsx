import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  onPress: () => void;
}

/**
 * Phase 10.1 Step 8 — Home's low-emphasis entry point into a Career
 * Check-in. Deliberately placed last on the screen and styled with plain
 * `Card` (never `cardElevated`) so it never competes with NextMoveCard,
 * which stays the dominant "do this now" surface — this is an always-
 * available, no-pressure option, not a nudge or a nag.
 */
export default function CheckinPromptCard({ onPress }: Props) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.emoji}>🗓️</Text>

        <View style={styles.textBlock}>
          <Text style={styles.title}>
            Anything changed since we last checked in?
          </Text>

          <Text style={styles.subtitle}>Takes about a minute.</Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  emoji: {
    fontSize: 24,
    marginRight: 14,
  },

  textBlock: {
    flex: 1,
  },

  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },

  subtitle: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 2,
  },

  chevron: {
    color: Colors.subtext,
    fontSize: 22,
  },
});
