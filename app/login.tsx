import { router } from "expo-router";
import Button from "../components/ui/Button";

import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signIn } from "../services/authService";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password.",
      );
      return;
    }

    const { error } = await signIn(email.trim(), password);

    if (error) {
      Alert.alert("Login Failed", error.message);
      return;
    }

    router.replace("/(app)/dashboard");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Velyqo</Text>

      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94A3B8"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94A3B8"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Sign In" onPress={handleLogin} />

      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={styles.signup}>
          Don&apos;t have an account? Create one
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    color: "#7C3AED",
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
  },

  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  button: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  signup: {
    color: "#A78BFA",
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
  },
});
