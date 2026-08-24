import { StyleSheet, Text, View } from "react-native";

interface Props {
  currentRole: string;
  targetRole: string;
}

export default function DashboardJourneyCard({
  currentRole,
  targetRole,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Career Journey</Text>

      <View style={styles.row}>
        <View style={styles.roleBox}>
          <Text style={styles.label}>Current</Text>
          <Text style={styles.role}>{currentRole}</Text>
        </View>

        <Text style={styles.arrow}>→</Text>

        <View style={styles.roleBox}>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.role}>{targetRole}</Text>
        </View>
      </View>

      <View style={styles.timeline}>
        <Text style={styles.timelineLabel}>Estimated Timeline</Text>
        <Text style={styles.timelineValue}>8 Months</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  roleBox: {
    flex: 1,
    alignItems: "center",
  },

  label: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 6,
  },

  role: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  arrow: {
    color: "#7C3AED",
    fontSize: 30,
    fontWeight: "700",
    marginHorizontal: 10,
  },

  timeline: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 18,
    alignItems: "center",
  },

  timelineLabel: {
    color: "#94A3B8",
    fontSize: 14,
  },

  timelineValue: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
});
