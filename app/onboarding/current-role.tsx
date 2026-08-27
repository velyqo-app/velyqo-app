import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import OccupationAutocomplete from "../../components/OccupationAutocomplete";
import { UserContext } from "../../context/UserContext";
import { useOccupationSearch } from "../../hooks/useOccupationSearch";
import { Occupation } from "../../types/occupation";

export default function CurrentRoleScreen() {
  const { userData, setUserData } = useContext(UserContext);

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

    router.push("/onboarding/target-role");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is your current role?</Text>

      <OccupationAutocomplete
        label="Current Occupation"
        placeholder="Start typing..."
        value={query}
        results={results}
        loading={loading}
        onChangeText={setQuery}
        onSelect={handleSelect}
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
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
    marginBottom: 24,
    textAlign: "center",
  },

  button: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
