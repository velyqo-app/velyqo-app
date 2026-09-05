import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";

interface Props {
  currentRole: string;
  targetRole: string;
}

/** The premium opening identity for Coach — deliberately compact (an eyebrow
 * label plus one role row) so it reads as "this is my coach, here's my
 * trajectory" without pushing the chat itself down the screen. */
export default function CoachHeader({ currentRole, targetRole }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR CAREER COACH</Text>

      <View style={styles.roleRow}>
        <Text style={styles.role} numberOfLines={1}>
          {currentRole || "Current role"}
        </Text>

        <Text style={styles.arrow}>→</Text>

        <Text style={[styles.role, styles.targetRole]} numberOfLines={1}>
          {targetRole || "Target role"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  eyebrow: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  role: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1,
  },

  arrow: {
    color: Colors.subtext,
    fontSize: 16,
    marginHorizontal: 8,
  },

  targetRole: {
    color: Colors.primary,
    flexShrink: 1,
  },
});
