import { StyleSheet, Text } from "react-native";

import { Colors } from "../constants/theme";

export default function TypingIndicator() {
  return <Text style={styles.text}>Your coach is thinking...</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: Colors.subtext,
    marginVertical: 10,
    marginLeft: 12,
    fontStyle: "italic",
    fontSize: 14,
  },
});
