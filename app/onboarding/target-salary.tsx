import { router } from "expo-router";
import { useContext, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { UserContext } from "../../context/UserContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import Button from "../../components/ui/Button";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

export default function TargetSalaryScreen() {
  const { userData, setUserData } = useContext(UserContext);
  const [salary, setSalary] = useState("");

  const handleContinue = () => {
    if (!salary.trim()) return;

    setUserData({
      ...userData,
      targetSalary: salary,
    });

    router.push("/onboarding/target-timeframe");
  };

  const skip = () => {
    setUserData({
      ...userData,
      targetSalary: "",
    });

    router.push("/onboarding/target-timeframe");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.targetSalary}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>
          What salary would you like to achieve? (Optional)
        </Text>

        <Text style={styles.subtitle}>
          Leave blank if you&apos;re not sure yet.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="50000"
          placeholderTextColor={Colors.subtext}
          keyboardType="numeric"
          value={salary}
          onChangeText={setSalary}
        />

        <Button title="Continue" onPress={handleContinue} />

        <TouchableOpacity style={styles.skipButton} onPress={skip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
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
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  subtitle: {
    color: Colors.subtext,
    textAlign: "center",
    marginBottom: Spacing.md,
  },

  input: {
    backgroundColor: Colors.card,
    color: Colors.text,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  skipButton: {
    marginTop: Spacing.md,
    alignItems: "center",
  },

  skipText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
