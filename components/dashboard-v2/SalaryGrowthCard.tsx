import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  currentSalary: string;
  targetSalary: number;
}

export default function SalaryGrowthCard({
  currentSalary,
  targetSalary,
}: Props) {
  const current = Number(currentSalary) || 0;
  const increase = targetSalary - current;

  return (
    <Card>
      <Text style={styles.title}>💰 Salary Growth</Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Current</Text>
          <Text style={styles.current}>£{current.toLocaleString()}</Text>
        </View>

        <Text style={styles.arrow}>→</Text>

        <View style={styles.column}>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.target}>£{targetSalary.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Potential Increase</Text>

        <Text style={styles.footerValue}>+£{increase.toLocaleString()}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 24,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  column: {
    flex: 1,
    alignItems: "center",
  },

  label: {
    color: Colors.subtext,
    fontSize: 14,
    marginBottom: 8,
  },

  current: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "700",
  },

  target: {
    color: Colors.success,
    fontSize: 24,
    fontWeight: "700",
  },

  arrow: {
    color: Colors.primary,
    fontSize: 30,
    fontWeight: "700",
    marginHorizontal: 10,
  },

  footer: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: "center",
  },

  footerLabel: {
    color: Colors.subtext,
    fontSize: 14,
  },

  footerValue: {
    color: Colors.success,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
});
