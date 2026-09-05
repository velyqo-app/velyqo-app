import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "../../constants/theme";

interface Props {
  label: string;
  value: string;

  /** Whether this is the last field in its card — suppresses the divider
   * below it so the card doesn't end with a trailing rule. */
  last?: boolean;

  /** Omitted for fields with nothing meaningful to edit right now (e.g.
   * Priority before any Destination Decision has ever been made) — renders
   * as a plain, inert row rather than a dead tappable one. */
  onPress?: () => void;
}

/** One row of the Career Blueprint. The whole row is the touch target when
 * editable, per the large-tappable-area principle, rather than a small
 * separate "Edit" button. */
export default function BlueprintField({ label, value, last, onPress }: Props) {
  const content = (
    <>
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>

        <Text style={styles.value}>{value}</Text>
      </View>

      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.row, !last && styles.withDivider]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, !last && styles.withDivider]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  withDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  textBlock: {
    flex: 1,
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

  chevron: {
    color: Colors.subtext,
    fontSize: 22,
    marginLeft: 12,
  },
});
