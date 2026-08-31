import { router } from "expo-router";
import { useContext } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import { getIndicativeSalary } from "../../data/salaries";
import { supabase } from "../../lib/supabase";
import { getCurrentUser } from "../../services/authService";
import {
  EDUCATION_LEVEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  STARTING_SITUATION_LABELS,
  TARGET_TIMEFRAME_LABELS,
} from "../../types/careerContext";

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
        current_occupation_id: userData.currentOccupationId,
        current_salary: userData.currentSalary
          ? Number(userData.currentSalary)
          : null,
        target_role: userData.targetRole,
        target_occupation_id: userData.targetOccupationId,
        target_salary: userData.targetSalary
          ? Number(userData.targetSalary)
          : null,
        starting_situation: userData.startingSituation || null,
        experience_level: userData.experienceLevel || null,
        education_level: userData.educationLevel || null,
        skills: userData.skills.length > 0 ? userData.skills : null,
        target_timeframe: userData.targetTimeframe || null,
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

      {userData.startingSituation ? (
        <Text style={styles.item}>
          Starting situation: {STARTING_SITUATION_LABELS[userData.startingSituation]}
        </Text>
      ) : null}

      {userData.experienceLevel ? (
        <Text style={styles.item}>
          Experience: {EXPERIENCE_LEVEL_LABELS[userData.experienceLevel]}
        </Text>
      ) : null}

      {userData.educationLevel ? (
        <Text style={styles.item}>
          Education: {EDUCATION_LEVEL_LABELS[userData.educationLevel]}
        </Text>
      ) : null}

      {userData.skills.length > 0 ? (
        <Text style={styles.item}>Skills: {userData.skills.join(", ")}</Text>
      ) : null}

      {userData.targetTimeframe ? (
        <Text style={styles.item}>
          Target timeframe: {TARGET_TIMEFRAME_LABELS[userData.targetTimeframe]}
        </Text>
      ) : null}

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
