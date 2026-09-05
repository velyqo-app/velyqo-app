import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  onPress: () => void;
}

/** Home's only navigation shortcut besides the bottom tabs — Career
 * Timeline/Journal/Profile links moved to the tab bar and Profile in
 * Phase 1, so this is deliberately the single remaining entry point here,
 * not a grid of equal-weight action buttons. */
export default function CareerCoachEntry({ onPress }: Props) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.emoji}>🤖</Text>

        <View style={styles.textBlock}>
          <Text style={styles.title}>Ask your Career Coach</Text>

          <Text style={styles.subtitle}>
            Get help deciding what to do next.
          </Text>
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
    fontSize: 28,
    marginRight: 14,
  },

  textBlock: {
    flex: 1,
  },

  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
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
