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

export default function CurrentSalaryScreen() {
  const { userData, setUserData } = useContext(UserContext);
  const [salary, setSalary] = useState("");

  const handleContinue = () => {
    if (!salary.trim()) return;

    setUserData({
      ...userData,
      currentSalary: salary,
    });

    router.push("/onboarding/target-salary");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is your current annual salary?</Text>

      <TextInput
        style={styles.input}
        placeholder="25000"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        value={salary}
        onChangeText={setSalary}
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
});
