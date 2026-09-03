import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import { RoadmapSalary } from "../../types/roadmap";
import Card from "../ui/Card";

interface Props {
  currentSalary: string;
  /** The user's own stated target figure, or null — never blended with
   * market data into a single number. */
  statedTargetSalary: number | null;
  /** Verified market data for the target role, or null when unavailable. */
  targetSalaryBand: RoadmapSalary | null;
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

export default function SalaryGrowthCard({
  currentSalary,
  statedTargetSalary,
  targetSalaryBand,
}: Props) {
  const current = Number(currentSalary) || null;

  if (statedTargetSalary === null && targetSalaryBand === null) {
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

  const increase =
    current !== null && statedTargetSalary !== null
      ? statedTargetSalary - current
      : null;

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

          <Text style={styles.target}>
            {statedTargetSalary === null
              ? "Not set"
              : `£${statedTargetSalary.toLocaleString()}`}
          </Text>
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

      <View style={styles.marketDivider} />

      <Text style={styles.marketLabel}>VERIFIED MARKET RANGE</Text>

      {targetSalaryBand ? (
        <>
          <Text style={styles.range}>
            {formatMoney(targetSalaryBand.currency, targetSalaryBand.low)} –{" "}
            {formatMoney(targetSalaryBand.currency, targetSalaryBand.high)}
          </Text>

          <Text style={styles.provenance}>
            {targetSalaryBand.dataType.toLowerCase()} data
            {targetSalaryBand.source ? ` · ${targetSalaryBand.source}` : ""} ·{" "}
            {targetSalaryBand.confidence}% confidence
          </Text>
        </>
      ) : (
        <Text style={styles.unavailable}>
          No verified market data available for this role yet.
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

  marketDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 24,
    marginBottom: 16,
  },

  marketLabel: {
    color: Colors.subtext,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 8,
  },

  range: {
    color: Colors.success,
    fontSize: 18,
    fontWeight: "700",
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
