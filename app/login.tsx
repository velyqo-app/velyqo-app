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
import type { ThemeColors } from "../constants/theme";
import { useThemeColors, useThemedStyles } from "../context/ThemeContext";

export default function LoginScreen() {
  const Colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

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
      Alert.alert(
        "Login Failed",
        "We couldn't sign you in. Please check your details and try again.",
      );
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
        placeholderTextColor={Colors.subtext}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={Colors.subtext}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Sign In" onPress={handleLogin} />

      <TouchableOpacity onPress={() => router.push("/forgot-password")}>
        <Text style={styles.forgotPassword}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={styles.signup}>
          Don&apos;t have an account? Create one
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    color: Colors.primary,
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
  },

  input: {
    backgroundColor: Colors.card,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  signup: {
    color: Colors.link,
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
  },

  forgotPassword: {
    color: Colors.link,
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
});
