import { Redirect, router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  impliesNoProfessionalExperience,
} from "../../types/careerContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

const OPTIONS: ExperienceLevel[] = [
  "none",
  "under_1",
  "1_to_3",
  "3_to_5",
  "5_to_10",
  "10_plus",
];

export default function ExperienceLevelScreen() {
  const { userData, setUserData } = useContext(UserContext);

  // current-role.tsx already routes student/no_experience users past this
  // screen. This guards the direct-navigation case (e.g. the back button)
  // rather than showing an irrelevant question.
  if (impliesNoProfessionalExperience(userData.startingSituation)) {
    return <Redirect href="/onboarding/target-role" />;
  }

  const select = (level: ExperienceLevel) => {
    setUserData({
      ...userData,
      experienceLevel: level,
    });

    router.push("/onboarding/target-role");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.experienceLevel}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>
          How much professional experience do you have in your current field?
        </Text>

        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.option}
            activeOpacity={0.85}
            onPress={() => select(option)}
          >
            <Text style={styles.optionText}>
              {EXPERIENCE_LEVEL_LABELS[option]}
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
