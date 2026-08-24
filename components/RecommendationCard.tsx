import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";

interface Props {
  recommendation: string;
}

export default function RecommendationCard({ recommendation }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>🤖 Today&apos;s Recommendation</Text>

      <Text style={styles.text}>{recommendation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 18,
    marginBottom: 22,
  },

  header: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 10,
  },

  text: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
  },
});
