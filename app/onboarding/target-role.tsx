import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import OccupationAutocomplete from "../../components/OccupationAutocomplete";
import { UserContext } from "../../context/UserContext";
import { useOccupationSearch } from "../../hooks/useOccupationSearch";
import { Occupation } from "../../types/occupation";

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
    <View style={styles.container}>
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
