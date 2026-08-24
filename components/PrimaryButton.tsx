import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { Colors, Radius, Spacing } from "../constants/theme";

export default function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: "center",
  },

  text: {
    color: Colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
});
