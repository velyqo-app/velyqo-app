import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";

import { Colors } from "../../constants/theme";

interface Props {
  name: string;
  progress: number;
  mission: string;
  estimatedTime: string;
  nextMilestone: string;
  impact: string;
}

export default function DailyBriefCard({
  name,
  progress,
  mission,
  estimatedTime,
  nextMilestone,
  impact,
}: Props) {
  const hour = new Date().getHours();

  let greeting = "Good Evening";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";

  const startMission = () => {
    router.push({
      pathname: "/ai-coach",
      params: {
        mission,
      },
    });
  };

  return (
    <Card>
      <Text style={styles.heading}>
        ☀️ {greeting}, {name || "there"}
      </Text>

      <Text style={styles.subHeading}>
        Here&apos;s your Career Brief for today.
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Career Readiness</Text>

        <Text style={styles.value}>{progress}%</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.label}>Today&apos;s Mission</Text>

        <Text style={styles.mission}>{mission}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.label}>Career Impact</Text>

        <Text style={styles.impact}>{impact}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.label}>Estimated Time</Text>

          <Text style={styles.small}>{estimatedTime}</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.label}>Next Milestone</Text>

          <Text style={styles.small}>{nextMilestone}</Text>
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <Button title="▶ Start Mission" onPress={startMission} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "700",
  },

  subHeading: {
    color: Colors.subtext,
    marginTop: 8,
    marginBottom: 24,
    fontSize: 15,
  },

  section: {
    marginBottom: 18,
  },

  label: {
    color: Colors.subtext,
    fontSize: 13,
    marginBottom: 6,
  },

  value: {
    color: Colors.success,
    fontSize: 32,
    fontWeight: "800",
  },

  mission: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },

  impact: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  row: {
    flexDirection: "row",
    gap: 16,
  },

  metric: {
    flex: 1,
  },

  small: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 18,
  },
});
