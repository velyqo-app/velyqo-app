import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { Colors, Radius } from "../../constants/theme";

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

const styles = StyleSheet.create({
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
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryText: {
    color: Colors.primary,
  },
});
