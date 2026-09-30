import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { Radius, type ThemeColors } from "../../constants/theme";
import { useThemedStyles } from "../../context/ThemeContext";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === "primary" ? styles.primary : styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[styles.text, variant === "secondary" && styles.secondaryText]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  primary: {
    backgroundColor: Colors.primary,
  },

  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  disabled: {
    opacity: 0.5,
  },

  text: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryText: {
    color: Colors.primary,
  },
});
