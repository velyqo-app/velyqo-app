import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
    return <View style={styles.container} />;
  }

  const suggested = getSuggestedSkills(category, userData.startingSituation);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 12,
  },
  button: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 28,
    marginBottom: 24,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
