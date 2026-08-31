import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  STARTING_SITUATION_LABELS,
  StartingSituation,
} from "../../types/careerContext";

const OPTIONS: StartingSituation[] = [
  "student",
  "early_career",
  "experienced",
  "changing_careers",
  "returning_to_work",
  "no_experience",
];

export default function StartingSituationScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const select = (situation: StartingSituation) => {
    setUserData({
      ...userData,
      startingSituation: situation,
    });

    router.push("/onboarding/current-role");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where are you starting from?</Text>

      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.option}
          onPress={() => select(option)}
        >
          <Text style={styles.optionText}>
            {STARTING_SITUATION_LABELS[option]}
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
