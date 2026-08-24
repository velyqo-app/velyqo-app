import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Colors, Radius, Spacing } from "../../constants/theme";

interface Props {
  children: ReactNode;
}

export default function Card({ children }: Props) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,

    borderRadius: Radius.lg,

    padding: Spacing.lg,

    marginBottom: Spacing.lg,

    borderWidth: 1,

    borderColor: Colors.border,
  },
});
