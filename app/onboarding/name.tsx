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

export default function NameScreen() {
  const [name, setName] = useState("");

  const { userData, setUserData } = useContext(UserContext);

  const handleContinue = () => {
    if (!name.trim()) {
      alert("Please enter your first name");
      return;
    }

    setUserData({
      ...userData,
      name: name.trim(),
    });

    router.push("/onboarding/purpose");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is your first name?</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your first name"
        placeholderTextColor="#94A3B8"
        value={name}
        onChangeText={setName}
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
