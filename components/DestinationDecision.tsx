import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../constants/theme";
import { SALARY_PRIORITY_LABELS, SalaryPriority } from "../types/careerContext";
import { DestinationComparison } from "../hooks/useRoadmap";
import Card from "./ui/Card";

interface Props {
  comparison: DestinationComparison;
  onChoose: (priority: SalaryPriority) => void;

  /** True while a choice is being processed — disables every option so a
   * second tap (the same one, or a different one) can't start a second,
   * competing operation before the first finishes. */
  submitting: boolean;
}

const OPTIONS: SalaryPriority[] = ["role", "salary", "balance", "both"];

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

/**
 * Shown before a roadmap is generated, only when checkSalaryConflict has
 * already confirmed — against a real occupation_salary_bands row — that the
 * requested target salary exceeds the verified range for the requested
 * role. Every figure here is either the user's own stated input or read
 * directly from that verified band; nothing is computed or guessed by this
 * component.
 */
export default function DestinationDecision({
  comparison,
  onChoose,
  submitting,
}: Props) {
  const { requestedTitle, requestedSalary, band, candidates, explanation } =
    comparison;

  return (
    <View>
      <Card>
        <Text style={styles.title}>Your target salary may need a step up</Text>

        <Text style={styles.roleTitle}>{requestedTitle}</Text>

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>YOU REQUESTED</Text>
            <Text style={styles.salary}>
              {formatMoney(band.currency, requestedSalary)}
            </Text>
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>VERIFIED MARKET RANGE</Text>
            <Text style={styles.range}>
              {formatMoney(band.currency, band.low)} –{" "}
              {formatMoney(band.currency, band.high)}
            </Text>
            <Text style={styles.provenance}>
              {band.dataType.toLowerCase()} data · {band.confidence}%
              confidence
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.explanation}>
          {explanation ||
            `Your target salary is above the typical verified range for ${requestedTitle}. Reaching it may require a more senior version of this role${
              candidates.length > 0
                ? `, such as ${candidates.map((c) => c.title).join(" or ")}`
                : ""
            }.`}
        </Text>

        {candidates.length === 0 && (
          <Text style={styles.caveat}>
            We don&apos;t have a specific senior role we can name with
            confidence for this field yet.
          </Text>
        )}
      </Card>

      <Text style={styles.question}>Which would you prefer?</Text>

      {submitting && (
        <View style={styles.submittingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.submittingText}>Processing your choice...</Text>
        </View>
      )}

      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.option, submitting && styles.optionDisabled]}
          disabled={submitting}
          onPress={() => {
            if (!submitting) {
              onChoose(option);
            }
          }}
        >
          <Text style={styles.optionText}>
            {SALARY_PRIORITY_LABELS[option]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },

  roleTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  column: {
    flex: 1,
  },

  label: {
    color: Colors.subtext,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 8,
  },

  salary: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
  },

  range: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: "700",
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 11,
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 18,
  },

  explanation: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 21,
  },

  caveat: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    fontStyle: "italic",
  },

  question: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 4,
    textAlign: "center",
  },

  option: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
  },

  optionDisabled: {
    opacity: 0.5,
  },

  optionText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  submittingText: {
    color: Colors.subtext,
    fontSize: 14,
    marginLeft: 10,
  },
});
