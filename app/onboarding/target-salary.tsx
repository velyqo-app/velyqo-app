import { router } from "expo-router";
import { useContext, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { UserContext } from "../../context/UserContext";

export default function TargetSalaryScreen() {
  const { userData, setUserData } = useContext(UserContext);
  const [salary, setSalary] = useState("");

  const handleContinue = () => {
    if (!salary.trim()) return;

    setUserData({
      ...userData,
      targetSalary: salary,
    });

    router.push("/onboarding/summary");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        What salary would you like to achieve? (Optional)
      </Text>

      <Text
        style={{
          color: "#94A3B8",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        Leave blank if you&apos;re not sure yet.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="50000"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        value={salary}
        onChangeText={setSalary}
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          setUserData({
            ...userData,
            targetSalary: "",
          });

          router.push("/onboarding/summary");
        }}
      >
        <Text style={styles.skipText}>Skip for now</Text>
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
    textAlign: "center",
    marginBottom: 30,
  },

  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
    fontSize: 16,
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

  skipButton: {
    marginTop: 16,
    alignItems: "center",
  },

  skipText: {
    color: "#A78BFA",
    fontSize: 16,
    fontWeight: "600",
  },
});
