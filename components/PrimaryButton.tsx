import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { Radius, Spacing, type ThemeColors } from "../constants/theme";
import { useThemedStyles } from "../context/ThemeContext";

export default function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: "center",
  },

  text: {
    color: Colors.onPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
});
