import { Redirect, router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  impliesNoProfessionalExperience,
} from "../../types/careerContext";

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
    <View style={styles.container}>
      <Text style={styles.title}>
        How much professional experience do you have in your current field?
      </Text>

      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.option}
          onPress={() => select(option)}
        >
          <Text style={styles.optionText}>
            {EXPERIENCE_LEVEL_LABELS[option]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 32,
  },
  option: {
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
