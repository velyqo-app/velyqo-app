import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  EDUCATION_LEVEL_LABELS,
  EducationLevel,
} from "../../types/careerContext";

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
    <View style={styles.container}>
      <Text style={styles.title}>
        What is your highest level of education? (Optional)
      </Text>

      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.option}
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
  skipButton: {
    marginTop: 8,
    alignItems: "center",
  },
  skipText: {
    color: "#A78BFA",
    fontSize: 16,
    fontWeight: "600",
  },
});
