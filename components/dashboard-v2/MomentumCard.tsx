import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import { Momentum } from "../../services/momentumService";
import Card from "../ui/Card";

interface Props {
  momentum: Momentum;
  streak: number;
  missionsCompleted: number;
}

export default function MomentumCard({
  momentum,
  streak,
  missionsCompleted,
}: Props) {
  return (
    <Card>
      <Text style={styles.title}>{momentum.emoji} Momentum</Text>

      <Text style={styles.level}>{momentum.level}</Text>

      <Text style={styles.message}>{momentum.message}</Text>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.value}>{streak}</Text>

          <Text style={styles.label}>Day Streak</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.value}>{missionsCompleted}</Text>

          <Text style={styles.label}>Missions</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "700",
  },

  level: {
    color: Colors.primary,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 12,
  },

  message: {
    color: Colors.subtext,
    fontSize: 16,
    marginTop: 10,
    lineHeight: 24,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  stat: {
    alignItems: "center",
  },

  value: {
    color: Colors.success,
    fontSize: 32,
    fontWeight: "800",
  },

  label: {
    color: Colors.subtext,
    marginTop: 6,
    fontSize: 14,
  },
});
