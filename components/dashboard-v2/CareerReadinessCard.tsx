import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  progress: number;
}

export default function CareerReadinessCard({ progress }: Props) {
  return (
    <Card>
      <Text style={styles.title}>Career Readiness</Text>

      <View style={styles.circle}>
        <Text style={styles.percent}>{progress}%</Text>
      </View>

      <Text style={styles.subtitle}>
        You&apos;re making great progress towards your goal.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },

  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "center",
  },

  percent: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: "800",
  },

  subtitle: {
    color: Colors.subtext,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
