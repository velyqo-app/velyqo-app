import { router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  STARTING_SITUATION_LABELS,
  StartingSituation,
} from "../../types/careerContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

const OPTIONS: StartingSituation[] = [
  "student",
  "early_career",
  "experienced",
  "changing_careers",
  "returning_to_work",
  "no_experience",
];

export default function StartingSituationScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const select = (situation: StartingSituation) => {
    setUserData({
      ...userData,
      startingSituation: situation,
    });

    router.push("/onboarding/current-role");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.startingSituation}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>Where are you starting from?</Text>

        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.option}
            activeOpacity={0.85}
            onPress={() => select(option)}
          >
            <Text style={styles.optionText}>
              {STARTING_SITUATION_LABELS[option]}
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
