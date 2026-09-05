import { StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Colors, Radius } from "../../constants/theme";

interface Props {
  label: string | null;
}

/** A small fixed pill, not part of the scrolling content — always tells the
 * user roughly where in calendar time their current scroll position sits,
 * the way a chat app's sticky date header does. Absent entirely (never a
 * placeholder) when the roadmap has no timing data to anchor a label to. */
export default function StickyDateIndicator({ label }: Props) {
  if (!label) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.pill}
    >
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    borderRadius: Radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 14,
    zIndex: 10,
  },

  text: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
