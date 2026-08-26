import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  currentSalary: string;
  /** Null when there is no reliable figure — never substitute a zero. */
  targetSalary: number | null;
  /** Where targetSalary came from, so the user can judge how much to trust it. */
  targetSalarySource: "stated" | "market" | null;
}

export default function SalaryGrowthCard({
  currentSalary,
  targetSalary,
  targetSalarySource,
}: Props) {
  const current = Number(currentSalary) || null;

  if (targetSalary === null) {
    return (
      <Card>
        <Text style={styles.title}>💰 Salary Growth</Text>

        <Text style={styles.unavailable}>
          We don&apos;t have reliable salary data for this role yet. Add a
          target salary during onboarding and it will appear here.
        </Text>
      </Card>
    );
  }

  const increase = current === null ? null : targetSalary - current;

  return (
    <Card>
      <Text style={styles.title}>💰 Salary Growth</Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Current</Text>

          <Text style={styles.current}>
            {current === null ? "Not set" : `£${current.toLocaleString()}`}
          </Text>
        </View>

        <Text style={styles.arrow}>→</Text>

        <View style={styles.column}>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.target}>£{targetSalary.toLocaleString()}</Text>
        </View>
      </View>

      {increase !== null && (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Potential Increase</Text>

          <Text style={styles.footerValue}>
            {increase >= 0
              ? `+£${increase.toLocaleString()}`
              : `-£${Math.abs(increase).toLocaleString()}`}
          </Text>
        </View>
      )}

      {targetSalarySource === "market" && (
        <Text style={styles.source}>
          Target based on an indicative UK market average, not your own figure.
        </Text>
      )}
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

  unavailable: {
    color: Colors.subtext,
    fontSize: 15,
    lineHeight: 22,
  },

  source: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: "center",
  },
});
