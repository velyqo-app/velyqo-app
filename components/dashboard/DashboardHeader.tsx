import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/theme";

interface Props {
  name: string;
  targetRole: string;
}

export default function DashboardHeader({ name, targetRole }: Props) {
  const hour = new Date().getHours();

  let greeting = "Good Evening";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";

  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>{greeting} 👋</Text>

      <Text style={styles.name}>{name || "Future Professional"}</Text>

      <View style={styles.divider} />

      <Text style={styles.label}>Career Goal</Text>

      <Text style={styles.role}>{targetRole}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 22,
    padding: 24,
    marginTop: 20,
    marginBottom: 22,
  },

  greeting: {
    color: Colors.subtext,
    fontSize: 16,
    fontWeight: "600",
  },

  name: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 20,
  },

  label: {
    color: Colors.subtext,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  role: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
});
