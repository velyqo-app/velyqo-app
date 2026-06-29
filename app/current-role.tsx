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

export default function CurrentRoleScreen() {
  const [currentRole, setCurrentRole] = useState("");

  const { userData, setUserData } = useContext(UserContext);

  const handleContinue = () => {
    if (!currentRole.trim()) {
      alert("Please enter your current role");
      return;
    }

    setUserData({
      ...userData,
      currentRole: currentRole.trim(),
    });

    router.push("/target-role");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is your current role?</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Warehouse Operative"
        placeholderTextColor="#94A3B8"
        value={currentRole}
        onChangeText={setCurrentRole}
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
