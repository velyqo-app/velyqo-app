import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";

interface Props {
  title: string;
  value: string;
}

export default function StatCard({ title, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 18,
    marginBottom: 18,
  },

  title: {
    color: Colors.subtext,
    fontSize: 14,
  },

  value: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
  },
});
