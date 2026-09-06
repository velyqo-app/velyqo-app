import { router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import OccupationAutocomplete from "../../components/OccupationAutocomplete";
import { UserContext } from "../../context/UserContext";
import { useOccupationSearch } from "../../hooks/useOccupationSearch";
import { Occupation } from "../../types/occupation";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import Button from "../../components/ui/Button";
import { Colors, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

export default function TargetRoleScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const { query, setQuery, results, loading, clearSearch } =
    useOccupationSearch();

  const handleSelect = (occupation: Occupation) => {
    setQuery(occupation.title);

    setUserData((prev) => ({
      ...prev,
      targetRole: occupation.title,
      targetOccupationId: occupation.id,
    }));

    clearSearch();
    setQuery(occupation.title);
  };

  // A prior selection's id must never survive a hand edit — otherwise
  // handleContinue's "already resolved" branch below keeps the old role
  // while the field shows whatever was just typed over it.
  const handleQueryChange = (text: string) => {
    setQuery(text);

    if (userData.targetOccupationId) {
      setUserData((prev) => ({
        ...prev,
        targetOccupationId: null,
      }));
    }
  };

  const handleContinue = () => {
    const typed = query.trim();

    // The occupation catalogue does not cover every role, so a user whose
    // target returns no matches must still be able to continue.
    if (!userData.targetOccupationId && !typed) {
      alert("Please enter your target occupation.");
      return;
    }

    if (!userData.targetOccupationId) {
      setUserData((prev) => ({
        ...prev,
        targetRole: typed,
        targetOccupationId: null,
      }));
    }

    clearSearch();

    router.push("/onboarding/education");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.targetRole}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>What role do you want to achieve?</Text>

        <OccupationAutocomplete
          label="Target Occupation"
          placeholder="Start typing..."
          value={query}
          results={results}
          loading={loading}
          onChangeText={handleQueryChange}
          onSelect={handleSelect}
        />

        <View style={styles.buttonSpacing}>
          <Button title="Continue" onPress={handleContinue} />
        </View>
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

  buttonSpacing: {
    marginTop: Spacing.lg,
  },
});
