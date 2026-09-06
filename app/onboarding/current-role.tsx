import { router } from "expo-router";
import { useContext } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import OccupationAutocomplete from "../../components/OccupationAutocomplete";
import { UserContext } from "../../context/UserContext";
import { useOccupationSearch } from "../../hooks/useOccupationSearch";
import { StartingSituation, impliesNoProfessionalExperience } from "../../types/careerContext";
import { Occupation } from "../../types/occupation";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import Button from "../../components/ui/Button";
import { Colors, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

// Keyed on startingSituation so the question never implies employment the
// user hasn't had. "" covers a user who somehow reaches this screen without
// having answered — falls back to the original, always-safe phrasing.
const TITLE_BY_SITUATION: Record<StartingSituation | "", string> = {
  "": "What is your current role?",
  early_career: "What is your current role?",
  experienced: "What is your current role?",
  changing_careers: "What is your current role?",
  returning_to_work: "What was your most recent role?",
  student: "What are you currently studying, or what field are you training in?",
  no_experience: "What kind of work or field are you interested in?",
};

export default function CurrentRoleScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const nextScreen = impliesNoProfessionalExperience(
    userData.startingSituation,
  )
    ? "/onboarding/target-role"
    : "/onboarding/experience-level";

  const { query, setQuery, results, loading, clearSearch } =
    useOccupationSearch();

  const handleSelect = (occupation: Occupation) => {
    setQuery(occupation.title);

    setUserData((prev) => ({
      ...prev,
      currentRole: occupation.title,
      currentOccupationId: occupation.id,
    }));

    clearSearch();
    setQuery(occupation.title);
  };

  // A prior selection's id must never survive a hand edit — otherwise
  // handleContinue's "already resolved" branch below keeps the old role
  // while the field shows whatever was just typed over it.
  const handleQueryChange = (text: string) => {
    setQuery(text);

    if (userData.currentOccupationId) {
      setUserData((prev) => ({
        ...prev,
        currentOccupationId: null,
      }));
    }
  };

  const handleContinue = () => {
    const typed = query.trim();

    // The occupation catalogue does not cover every role, so a user whose job
    // returns no matches must still be able to continue.
    if (!userData.currentOccupationId && !typed) {
      alert("Please enter your current occupation.");
      return;
    }

    if (!userData.currentOccupationId) {
      setUserData((prev) => ({
        ...prev,
        currentRole: typed,
        currentOccupationId: null,
      }));
    }

    clearSearch();

    router.push(nextScreen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingProgress
          step={ONBOARDING_STEP.currentRole}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>
          {TITLE_BY_SITUATION[userData.startingSituation]}
        </Text>

        <OccupationAutocomplete
          label="Current Occupation"
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
