import { StyleSheet, Text } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  impact: string;
}

/** Concise and contextual, per spec — a short "why," not a repeat of the
 * roadmap detail that belongs on Journey. */
export default function WhyThisMattersCard({ impact }: Props) {
  return (
    <Card>
      <Text style={styles.label}>WHY THIS MATTERS</Text>

      <Text style={styles.impact}>{impact}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.subtext,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 10,
  },

  impact: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});
