import { router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

const COUNTRIES = [
  { emoji: "🇬🇧", label: "United Kingdom" },
  { emoji: "🇺🇸", label: "United States" },
  { emoji: "🇨🇦", label: "Canada" },
  { emoji: "🇦🇺", label: "Australia" },
  { emoji: "🌍", label: "Other" },
];

export default function CountryScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const selectCountry = (country: string) => {
    setUserData({
      ...userData,
      country,
    });

    router.push("/onboarding/current-salary");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.country}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>Which country do you currently live in?</Text>

        {COUNTRIES.map((entry) => (
          <TouchableOpacity
            key={entry.label}
            style={styles.option}
            activeOpacity={0.85}
            onPress={() => selectCountry(entry.label)}
          >
            <Text style={styles.optionText}>
              {entry.emoji} {entry.label}
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
