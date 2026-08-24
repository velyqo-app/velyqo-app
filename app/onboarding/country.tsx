import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";

export default function CountryScreen() {
  const { userData, setUserData } = useContext(UserContext);

  const selectCountry = (country: string) => {
    setUserData({
      ...userData,
      country,
    });

    router.push("/onboarding/current-role");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Which country do you currently live in?</Text>

      <TouchableOpacity
        style={styles.option}
        onPress={() => selectCountry("United Kingdom")}
      >
        <Text style={styles.optionText}>🇬🇧 United Kingdom</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => selectCountry("United States")}
      >
        <Text style={styles.optionText}>🇺🇸 United States</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => selectCountry("Canada")}
      >
        <Text style={styles.optionText}>🇨🇦 Canada</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => selectCountry("Australia")}
      >
        <Text style={styles.optionText}>🇦🇺 Australia</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => selectCountry("Other")}
      >
        <Text style={styles.optionText}>🌍 Other</Text>
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
});
