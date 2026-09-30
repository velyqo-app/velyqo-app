import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { signUp } from "../services/authService";
import type { ThemeColors } from "../constants/theme";
import { useThemeColors, useThemedStyles } from "../context/ThemeContext";

export default function SignupScreen() {
  const Colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords Don't Match",
        "Please make sure both passwords are the same.",
      );
      return;
    }

    const { error } = await signUp(email.trim(), password);

    if (error) {
      Alert.alert(
        "Sign Up Failed",
        "We couldn't create your account. Please check your details and try again.",
      );
      return;
    }

    Alert.alert("Success", "Your account has been created.");

    router.replace("/onboarding/name");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Velyqo</Text>

      <Text style={styles.title}>Create your account</Text>

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

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor={Colors.subtext}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        By creating an account, you agree to our{" "}
        <Text style={styles.termsLink} onPress={() => router.push("/terms")}>
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text
          style={styles.termsLink}
          onPress={() => router.push("/privacy")}
        >
          Privacy Policy
        </Text>
        .
      </Text>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.login}>Already have an account? Sign In</Text>
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

  login: {
    color: Colors.link,
    textAlign: "center",
    marginTop: 24,
    fontSize: 15,
  },

  terms: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    lineHeight: 19,
  },

  termsLink: {
    color: Colors.link,
    fontWeight: "600",
  },
});
