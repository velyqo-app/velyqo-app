import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import {
  TARGET_TIMEFRAME_LABELS,
  TargetTimeframe,
} from "../../types/careerContext";

const OPTIONS: TargetTimeframe[] = [
  "as_fast_as_possible",
  "1_to_2_years",
  "3_to_5_years",
  "5_to_10_years",
  "flexible",
];

export default function TargetTimeframeScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const select = (timeframe: TargetTimeframe) => {
    setUserData({
      ...userData,
      targetTimeframe: timeframe,
    });

    router.push("/onboarding/summary");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        How quickly do you want to get there?
      </Text>

      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.option}
          onPress={() => select(option)}
        >
          <Text style={styles.optionText}>
            {TARGET_TIMEFRAME_LABELS[option]}
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
