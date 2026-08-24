import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/theme";
import { formatSalary } from "../../utils/formatSalary";

interface Props {
  currentSalary: string;
  targetSalary: number;
}

export default function DashboardSalaryCard({
  currentSalary,
  targetSalary,
}: Props) {
  const current = Number(currentSalary || 0);
  const increase = Math.max(targetSalary - current, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>💷 Salary Journey</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Current</Text>
        <Text style={styles.value}>{formatSalary(current)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Target</Text>
        <Text style={styles.value}>{formatSalary(targetSalary)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Increase</Text>
        <Text style={styles.increase}>+{formatSalary(increase)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
  },

  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  label: {
    color: Colors.subtext,
    fontSize: 15,
  },

  value: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  increase: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700",
  },
});
