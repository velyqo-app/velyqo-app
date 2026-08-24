import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";

import { Colors } from "../../constants/theme";

export default function QuickActions() {
  return (
    <Card>
      <Text style={styles.title}>Continue Your Journey</Text>

      <View style={styles.spacing}>
        <Button title="🤖 AI Coach" onPress={() => router.push("/ai-coach")} />
      </View>

      <View style={styles.spacing}>
        <Button
          title="🛣 Career Timeline"
          variant="secondary"
          onPress={() => router.push("/timeline")}
        />
      </View>

      <Button
        title="📖 Career Journal"
        variant="secondary"
        onPress={() => router.push("/career-journal")}
      />
      <View style={styles.spacing}></View>
      <Button
        title="👤 My Profile"
        variant="secondary"
        onPress={() => router.push("/profile")}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },

  spacing: {
    marginBottom: 14,
  },
});
