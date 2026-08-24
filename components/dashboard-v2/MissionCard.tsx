import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  title: string;
}

export default function MissionCard({ title }: Props) {
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.icon}>🔥</Text>

        <Text style={styles.heading}>Today&apos;s Mission</Text>
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Estimated Time</Text>
          <Text style={styles.footerValue}>30 Minutes</Text>
        </View>

        <View>
          <Text style={styles.footerLabel}>Career Impact</Text>
          <Text style={styles.stars}>★★★★★</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  icon: {
    fontSize: 22,
    marginRight: 10,
  },

  heading: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
  },

  title: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
    marginBottom: 24,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 18,
  },

  footerLabel: {
    color: Colors.subtext,
    fontSize: 13,
  },

  footerValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },

  stars: {
    color: "#F59E0B",
    fontSize: 18,
    marginTop: 4,
  },
});
