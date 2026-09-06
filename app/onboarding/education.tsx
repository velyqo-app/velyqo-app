import { router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  EDUCATION_LEVEL_LABELS,
  EducationLevel,
} from "../../types/careerContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

const OPTIONS: EducationLevel[] = [
  "gcse",
  "a_level",
  "apprenticeship",
  "undergraduate",
  "masters",
  "doctorate",
  "professional_qualification",
  "other",
];

export default function EducationScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const select = (level: EducationLevel) => {
    setUserData({
      ...userData,
      educationLevel: level,
    });

    router.push("/onboarding/skills");
  };

  const skip = () => {
    setUserData({
      ...userData,
      educationLevel: "prefer_not_to_say",
    });

    router.push("/onboarding/skills");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress
          step={ONBOARDING_STEP.education}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>
          What is your highest level of education? (Optional)
        </Text>

        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.option}
            activeOpacity={0.85}
            onPress={() => select(option)}
          >
            <Text style={styles.optionText}>
              {EDUCATION_LEVEL_LABELS[option]}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.skipButton} onPress={skip}>
          <Text style={styles.skipText}>Prefer not to say</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
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

  skipButton: {
    marginTop: Spacing.xs,
    alignItems: "center",
  },

  skipText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
