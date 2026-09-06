import { router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  TARGET_TIMEFRAME_LABELS,
  TargetTimeframe,
} from "../../types/careerContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

const OPTIONS: TargetTimeframe[] = [
  "as_fast_as_possible",
  "1_to_2_years",
  "3_to_5_years",
  "5_to_10_years",
  "flexible",
];

export default function TargetTimeframeScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const select = (timeframe: TargetTimeframe) => {
    setUserData({
      ...userData,
      targetTimeframe: timeframe,
    });

    router.push("/onboarding/summary");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.targetTimeframe}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>How quickly do you want to get there?</Text>

        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.option}
            activeOpacity={0.85}
            onPress={() => select(option)}
          >
            <Text style={styles.optionText}>
              {TARGET_TIMEFRAME_LABELS[option]}
            </Text>
          </TouchableOpacity>
        ))}
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
    marginBottom: Spacing.lg,
  },

  option: {
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  optionText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
