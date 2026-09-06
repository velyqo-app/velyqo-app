import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing } from "../../constants/theme";

interface Props {
  title: string;
}

/** The shared top-of-screen identity for Journey, Profile and Career
 * Journal — one container/title treatment so the three read as the same
 * product rather than three slightly different header implementations.
 * Deliberately plain (no eyebrow/role row) — that richer treatment is
 * Coach's own, content-specific header, not a convention these screens
 * need to borrow. */
export default function ScreenHeader({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
});
