import { router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UserContext } from "../../context/UserContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

const GOALS = [
  { emoji: "📈", label: "Advance my career", value: "Advance my career" },
  { emoji: "🔄", label: "Change careers", value: "Change careers" },
  { emoji: "🧭", label: "Explore careers", value: "Explore careers" },
  { emoji: "💰", label: "Increase my income", value: "Increase my income" },
  { emoji: "🚀", label: "Plan my future", value: "Plan my future" },
];

export default function PurposeScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const selectGoal = (goal: string) => {
    setUserData({
      ...userData,
      goal,
    });

    router.push("/onboarding/starting-situation");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.purpose}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>Welcome {userData.name || "there"}!</Text>

        <Text style={styles.subtitle}>
          What would you like Velyqo to help you with?
        </Text>

        {GOALS.map((goal) => (
          <TouchableOpacity
            key={goal.value}
            style={styles.option}
            activeOpacity={0.85}
            onPress={() => selectGoal(goal.value)}
          >
            <Text style={styles.optionText}>
              {goal.emoji} {goal.label}
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
    marginBottom: Spacing.sm,
  },

  subtitle: {
    color: Colors.subtext,
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
