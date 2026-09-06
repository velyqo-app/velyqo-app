import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import SkillSelector from "../../components/SkillSelector";
import { UserContext } from "../../context/UserContext";
import {
  getOccupationById,
  resolveOccupationByTitle,
} from "../../services/occupationService";
import {
  getAllKnownSkills,
  getSuggestedSkills,
} from "../../services/skillSuggestionService";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import Button from "../../components/ui/Button";
import { Colors, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

export default function SkillsScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const [category, setCategory] = useState<string | null>(null);

  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveCategory = async () => {
      // Suggestions reflect the skills the user is likely to already have
      // from their CURRENT role, not what the target role would need.
      if (userData.currentOccupationId) {
        const occupation = await getOccupationById(userData.currentOccupationId);

        if (active) {
          setCategory(occupation?.category ?? null);
          setResolving(false);
        }

        return;
      }

      if (userData.currentRole.trim()) {
        const resolved = await resolveOccupationByTitle(userData.currentRole);

        if (active) {
          setCategory(resolved?.category ?? null);
          setResolving(false);
        }

        return;
      }

      if (active) {
        setResolving(false);
      }
    };

    resolveCategory();

    return () => {
      active = false;
    };
  }, [userData.currentOccupationId, userData.currentRole]);

  const handleContinue = () => {
    router.push("/onboarding/country");
  };

  if (resolving) {
    return <SafeAreaView style={styles.container} />;
  }

  const suggested = getSuggestedSkills(category, userData.startingSituation);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress
          step={ONBOARDING_STEP.skills}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>Which skills do you already have?</Text>

        <Text style={styles.subtitle}>
          Select the ones that genuinely apply to you.
        </Text>

        <SkillSelector
          suggested={suggested}
          allKnown={getAllKnownSkills()}
          selected={userData.skills}
          onChange={(skills) => setUserData({ ...userData, skills })}
        />

        <View style={styles.buttonSpacing}>
          <Button title="Continue" onPress={handleContinue} />
        </View>
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
  },

  subtitle: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  buttonSpacing: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
