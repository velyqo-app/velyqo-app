import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface Props {
  title: string;
  description: string;
  estimatedTime: string;
  onStart: () => void;
}

/** The dominant element on Home — deliberately the largest, most visually
 * weighted section on the screen, per "the user should know the primary
 * action immediately." The whole card starts the mission, not just the
 * button — tapping the button also fires the same handler (React Native
 * gives the touch to whichever element is deepest, so this never double
 * fires), matching the "whole cards tappable" principle while still giving
 * a clear, explicit call-to-action for anyone scanning for a button. */
export default function NextMoveCard({
  title,
  description,
  estimatedTime,
  onStart,
}: Props) {
  return (
    <Card onPress={onStart}>
      <Text style={styles.label}>YOUR NEXT MOVE</Text>

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.footer}>
        <Text style={styles.time}>⏱ {estimatedTime}</Text>
      </View>

      <View style={styles.buttonSpacing}>
        <Button title="▶ Start" onPress={onStart} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.primary,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 10,
  },

  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },

  description: {
    color: Colors.subtext,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },

  footer: {
    marginTop: 16,
  },

  time: {
    color: Colors.subtext,
    fontSize: 14,
    fontWeight: "600",
  },

  buttonSpacing: {
    marginTop: 20,
  },
});
