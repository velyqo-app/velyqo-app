import { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Radius, Spacing, type ThemeColors } from "../../constants/theme";
import { useThemedStyles } from "../../context/ThemeContext";

interface Props {
  children: ReactNode;

  /** When provided, the whole card becomes a single large touch target
   * instead of relying on small buttons inside it. Omitted everywhere a
   * card is purely informational, which is unaffected by this prop. */
  onPress?: () => void;
}

export default function Card({ children, onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.card}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{children}</View>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.card,

    borderRadius: Radius.lg,

    padding: Spacing.lg,

    marginBottom: Spacing.lg,

    borderWidth: 1,

    borderColor: Colors.border,
  },
});
