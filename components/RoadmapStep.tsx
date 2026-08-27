import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../constants/theme";
import { RoadmapStep as RoadmapStepData } from "../types/roadmap";
import Card from "./ui/Card";

interface Props {
  index: number;
  step: RoadmapStepData;
}

function formatMoney(currency: string, amount: number) {
  // The band carries its own currency, so never assume a symbol.
  return `${currency} ${amount.toLocaleString()}`;
}

export default function RoadmapStep({ index, step }: Props) {
  const { salary } = step;

  return (
    <Card>
      <Text style={styles.stepNumber}>STEP {index + 1}</Text>

      <Text style={styles.title}>{step.title}</Text>

      {step.level ? <Text style={styles.level}>{step.level}</Text> : null}

      {/* Every AI field below is optional — catalogue rungs have none of it. */}
      {step.description ? (
        <Text style={styles.description}>{step.description}</Text>
      ) : null}

      {step.estimatedTime ? (
        <Text style={styles.time}>⏱ {step.estimatedTime}</Text>
      ) : null}

      {step.skills.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Skills to develop</Text>

          {step.skills.map((skill) => (
            <Text key={skill} style={styles.listItem}>
              ✓ {skill}
            </Text>
          ))}
        </View>
      )}

      {step.actions.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Actions</Text>

          {step.actions.map((action) => (
            <Text key={action} style={styles.listItem}>
              • {action}
            </Text>
          ))}
        </View>
      )}

      {step.rationale ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Why this step</Text>

          <Text style={styles.rationale}>{step.rationale}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        {salary ? (
          <>
            <Text style={styles.blockTitle}>Typical salary</Text>

            <Text style={styles.salary}>
              {formatMoney(salary.currency, salary.median)}
            </Text>

            <Text style={styles.range}>
              {formatMoney(salary.currency, salary.low)} –{" "}
              {formatMoney(salary.currency, salary.high)}
            </Text>

            <Text style={styles.provenance}>
              {salary.dataType.toLowerCase()} data
              {salary.source ? ` · ${salary.source}` : ""} ·{" "}
              {salary.confidence}% confidence
            </Text>
          </>
        ) : (
          <Text style={styles.unavailable}>
            No verified salary data for this role yet.
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stepNumber: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
  },

  level: {
    color: Colors.subtext,
    fontSize: 14,
    marginTop: 4,
  },

  description: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },

  rationale: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  time: {
    color: Colors.subtext,
    marginTop: 12,
  },

  block: {
    marginTop: 16,
  },

  blockTitle: {
    color: Colors.subtext,
    fontSize: 13,
    marginBottom: 6,
  },

  listItem: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 8,
  },

  salary: {
    color: Colors.success,
    fontSize: 22,
    fontWeight: "800",
  },

  range: {
    color: Colors.subtext,
    marginTop: 4,
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  unavailable: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
});
