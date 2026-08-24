import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Colors, Spacing } from "../../constants/theme";

interface Props {
  message?: string;
}

export default function LoadingScreen({
  message = "Preparing your career dashboard...",
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VELYQO</Text>

      <ActivityIndicator
        size="large"
        color={Colors.primary}
        style={styles.spinner}
      />

      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },

  logo: {
    color: Colors.primary,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 30,
  },

  spinner: {
    marginBottom: 24,
  },

  message: {
    color: Colors.subtext,
    fontSize: 16,
    textAlign: "center",
  },
});
