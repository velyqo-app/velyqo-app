import { StyleSheet, Text } from "react-native";

import type { ThemeColors } from "../constants/theme";
import { useThemedStyles } from "../context/ThemeContext";

export default function TypingIndicator() {
  const styles = useThemedStyles(createStyles);

  return <Text style={styles.text}>Your coach is thinking...</Text>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  text: {
    color: Colors.subtext,
    marginVertical: 10,
    marginLeft: 12,
    fontStyle: "italic",
    fontSize: 14,
  },
});
