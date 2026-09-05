import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Radius, Shadows, Spacing } from "../../constants/theme";
import { Roadmap } from "../../types/roadmap";

interface Props {
  roadmap: Roadmap;

  /** "OCT 2026" / "2028", or null when the roadmap has no per-step timing to
   * anchor an arrival estimate from — never a guessed date. */
  arrivalLabel: string | null;
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

/**
 * The single most visually emphasized card in the Journey — the whole point
 * of the timeline is to arrive here. One restrained gloss sweep and the
 * elevated surface are reserved for this and the current milestone only.
 */
export default function TargetArrivalCard({ roadmap, arrivalLabel }: Props) {
  const { target } = roadmap;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[Colors.highlight, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Text style={styles.badge}>DESTINATION</Text>

      <Text style={styles.title}>{target.title}</Text>

      {arrivalLabel && (
        <Text style={styles.arrival}>
          Estimated arrival: around {arrivalLabel}
        </Text>
      )}

      {target.salary ? (
        <View style={styles.salaryBlock}>
          <Text style={styles.salaryLabel}>VERIFIED MARKET RANGE</Text>

          <Text style={styles.salaryRange}>
            {formatMoney(target.salary.currency, target.salary.low)} –{" "}
            {formatMoney(target.salary.currency, target.salary.high)}
          </Text>

          <Text style={styles.provenance}>
            {target.salary.dataType.toLowerCase()} data ·{" "}
            {target.salary.confidence}% confidence
          </Text>
        </View>
      ) : (
        <Text style={styles.unavailable}>
          No verified market data available for this role yet.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    padding: Spacing.lg,
    overflow: "hidden",
    ...Shadows.card,
  },

  badge: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 10,
  },

  title: {
    color: Colors.text,
    fontSize: 23,
    fontWeight: "800",
  },

  arrival: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 10,
  },

  salaryBlock: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  salaryLabel: {
    color: Colors.subtext,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 6,
  },

  salaryRange: {
    color: Colors.success,
    fontSize: 18,
    fontWeight: "700",
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: 6,
  },

  unavailable: {
    color: Colors.subtext,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
});
