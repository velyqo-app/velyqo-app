import { StyleSheet, Text } from "react-native";

export default function TypingIndicator() {
  return <Text style={styles.text}>🤖 Velyqo is thinking...</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: "#94A3B8",
    marginVertical: 10,
    marginLeft: 12,
    fontStyle: "italic",
  },
});
