import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  name: string;
  targetRole: string;
  progress: number;
}

export default function HeroCard({ name, targetRole, progress }: Props) {
  const hour = new Date().getHours();

  let greeting = "Good Evening";

  if (hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 18) {
    greeting = "Good Afternoon";
  }

  return (
    <Card>
      <Text style={styles.greeting}>{greeting} 👋</Text>

      <Text style={styles.name}>{name || "Future Professional"}</Text>

      <View style={styles.divider} />

      <Text style={styles.label}>TARGET ROLE</Text>

      <Text style={styles.role}>{targetRole}</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Career Progress</Text>

          <Text style={styles.progressValue}>{progress}%</Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  greeting: {
    color: Colors.subtext,
    fontSize: 16,
    fontWeight: "600",
  },

  name: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 22,
  },

  label: {
    color: Colors.subtext,
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: "700",
  },

  role: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },

  progressContainer: {
    marginTop: 26,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  progressLabel: {
    color: Colors.subtext,
    fontSize: 15,
  },

  progressValue: {
    color: Colors.success,
    fontSize: 15,
    fontWeight: "700",
  },

  progressBar: {
    backgroundColor: "#334155",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    backgroundColor: Colors.primary,
    height: "100%",
    borderRadius: 999,
  },
});
