import { StyleSheet, View } from "react-native";
import { Radius, Spacing, type ThemeColors } from "../constants/theme";
import { useThemedStyles } from "../context/ThemeContext";

export default function AppCard({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);

  return <View style={styles.card}>{children}</View>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
});
