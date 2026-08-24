import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";

interface Props {
  progress: number;
}

export default function ProgressCard({ progress }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Career Progress</Text>

      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              width: `${progress}%`,
            },
          ]}
        />
      </View>

      <Text style={styles.percent}>{progress}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
  },

  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },

  barBackground: {
    height: 12,
    backgroundColor: "#334155",
    borderRadius: 10,
    overflow: "hidden",
  },

  barFill: {
    height: 12,
    backgroundColor: Colors.primary,
  },

  percent: {
    marginTop: 12,
    color: Colors.subtext,
    fontSize: 15,
  },
});
