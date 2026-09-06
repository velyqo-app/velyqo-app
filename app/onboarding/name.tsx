import { router } from "expo-router";
import { useContext, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { UserContext } from "../../context/UserContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import Button from "../../components/ui/Button";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.name}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>What is your first name?</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your first name"
          placeholderTextColor={Colors.subtext}
          value={name}
          onChangeText={setName}
        />

        <Button title="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
  },

  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },

  input: {
    backgroundColor: Colors.card,
    color: Colors.text,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
