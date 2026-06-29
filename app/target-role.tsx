import { router } from "expo-router";
import { useContext, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { UserContext } from "../context/UserContext";

export default function TargetRoleScreen() {
  const [targetRole, setTargetRole] = useState("");

  const { userData, setUserData } = useContext(UserContext);

  const handleContinue = () => {
    if (!targetRole.trim()) {
      alert("Please enter your target role");
      return;
    }

    setUserData({
      ...userData,
      targetRole: targetRole.trim(),
    });

    router.push("/current-salary");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What role do you want to reach?</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Cybersecurity Analyst"
        placeholderTextColor="#94A3B8"
        value={targetRole}
        onChangeText={setTargetRole}
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    padding: 24,
    justifyContent: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },

  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },

  button: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
