import { router } from "expo-router";
import { useContext } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import { getIndicativeSalary } from "../../data/salaries";
import { supabase } from "../../lib/supabase";
import { getCurrentUser } from "../../services/authService";

export default function SummaryScreen() {
  const { userData } = useContext(UserContext);

  const roleInfo = getIndicativeSalary(userData.targetRole, userData.country);

  const saveProfile = async () => {
    const session = await getCurrentUser();

    const {
      data: { user },
    } = session;

    if (!user) {
      Alert.alert("Error", "You must be signed in.");
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: userData.name,
        goal: userData.goal,
        country: userData.country,
        current_role: userData.currentRole,
        current_salary: userData.currentSalary
          ? Number(userData.currentSalary)
          : null,
        target_role: userData.targetRole,
        target_salary: userData.targetSalary
          ? Number(userData.targetSalary)
          : null,
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      console.log(error);
      Alert.alert("Save Failed", error.message);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Velyqo Profile</Text>

      <Text style={styles.item}>Name: {userData.name}</Text>

      <Text style={styles.item}>Goal: {userData.goal}</Text>

      <Text style={styles.item}>Country: {userData.country}</Text>

      <Text style={styles.item}>Current Role: {userData.currentRole}</Text>

      <Text style={styles.item}>
        Current Salary:{" "}
        {userData.currentSalary
          ? `£${Number(userData.currentSalary).toLocaleString()}`
          : "Not provided"}
      </Text>

      <Text style={styles.item}>Target Role: {userData.targetRole}</Text>

      <Text style={styles.item}>
        Target Salary:{" "}
        {userData.targetSalary
          ? `£${Number(userData.targetSalary).toLocaleString()}`
          : "Not provided"}
      </Text>

      {roleInfo && (
        <>
          <Text style={styles.item}>
            Average Salary: £{roleInfo.average.toLocaleString()}
          </Text>

          <Text style={styles.item}>
            Salary Range: £{roleInfo.min.toLocaleString()} - £
            {roleInfo.max.toLocaleString()}
          </Text>

          {userData.currentSalary ? (
            <Text style={styles.item}>
              Potential Increase: £
              {(
                roleInfo.average - Number(userData.currentSalary)
              ).toLocaleString()}
            </Text>
          ) : null}

          <Text style={styles.provenance}>
            Indicative UK market estimate, not a figure specific to you.
          </Text>
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={saveProfile}>
        <Text style={styles.buttonText}>Create My Career Roadmap</Text>
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
    marginBottom: 32,
    textAlign: "center",
  },

  item: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 12,
  },

  provenance: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },

  button: {
    backgroundColor: "#7C3AED",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 30,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
