import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";

interface Props {
  label: string;
  value: string;

  /** Whether this is the last field in its card — suppresses the divider
   * below it so the card doesn't end with a trailing rule. */
  last?: boolean;
}

/** One row of the Career Blueprint — display only in this phase. Deliberately
 * a standalone component (not inlined) so a future edit affordance can be
 * added here without reshaping every call site. */
export default function BlueprintField({ label, value, last }: Props) {
  return (
    <View style={[styles.container, !last && styles.withDivider]}>
      <Text style={styles.label}>{label}</Text>

      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
  },

  withDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  label: {
    color: Colors.subtext,
    fontSize: 13,
    marginBottom: 6,
  },

  value: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
