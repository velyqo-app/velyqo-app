import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  currentRole: string;
  targetRole: string;
  onPress: () => void;
}

/** A single scannable row, not a stat card — answers "where am I / where am
 * I going" in one glance. The whole row is the touch target, per the
 * social-app-usability principle of large tappable areas over tiny buttons. */
export default function RoleIndicatorRow({
  currentRole,
  targetRole,
  onPress,
}: Props) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.roleBlock}>
          <Text style={styles.label}>CURRENT</Text>

          <Text style={styles.role} numberOfLines={1}>
            {currentRole || "Not set"}
          </Text>
        </View>

        <Text style={styles.arrow}>→</Text>

        <View style={styles.roleBlock}>
          <Text style={styles.label}>TARGET</Text>

          <Text style={[styles.role, styles.targetRole]} numberOfLines={1}>
            {targetRole || "Not set"}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  roleBlock: {
    flex: 1,
  },

  label: {
    color: Colors.subtext,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 4,
  },

  role: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  targetRole: {
    color: Colors.primary,
  },

  arrow: {
    color: Colors.subtext,
    fontSize: 18,
    marginHorizontal: 12,
  },
});
