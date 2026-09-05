import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import { supabase } from "../../lib/supabase";
import { getCurrentUser } from "../../services/authService";
import { toCountryCode } from "../../services/countryService";
import { loadSalary, resolveEndpoint } from "../../services/roadmapService";
import {
  EDUCATION_LEVEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  STARTING_SITUATION_LABELS,
  TARGET_TIMEFRAME_LABELS,
} from "../../types/careerContext";
import { RoadmapSalary } from "../../types/roadmap";

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

export default function SummaryScreen() {
  const { userData } = useContext(UserContext);

  // Same authoritative lookup Dashboard/Timeline use (resolveEndpoint +
  // loadSalary against occupation_salary_bands) — never the retired seeded
  // table, so the blueprint can never disagree with the rest of the app on
  // this figure.
  const [targetSalaryBand, setTargetSalaryBand] =
    useState<RoadmapSalary | null>(null);

  useEffect(() => {
    let active = true;

    const loadTargetSalary = async () => {
      if (!userData.targetRole.trim()) {
        if (active) {
          setTargetSalaryBand(null);
        }
        return;
      }

      const occupation = await resolveEndpoint(
        userData.targetRole,
        userData.targetOccupationId,
      );

      const band = await loadSalary(
        occupation?.id ?? null,
        toCountryCode(userData.country),
      );

      if (active) {
        setTargetSalaryBand(band);
      }
    };

    loadTargetSalary();

    return () => {
      active = false;
    };
  }, [userData.targetRole, userData.targetOccupationId, userData.country]);

  const statedCurrentSalary = userData.currentSalary
    ? Number(userData.currentSalary)
    : null;

  const statedTargetSalary = userData.targetSalary
    ? Number(userData.targetSalary)
    : null;

  const increase =
    statedCurrentSalary !== null && statedTargetSalary !== null
      ? statedTargetSalary - statedCurrentSalary
      : null;

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

      {increase !== null ? (
        <Text style={styles.item}>
          Potential Increase:{" "}
          {increase >= 0
            ? `£${increase.toLocaleString()}`
            : `-£${Math.abs(increase).toLocaleString()}`}
        </Text>
      ) : null}

      <Text style={styles.item}>Verified Market Range</Text>

      {targetSalaryBand ? (
        <>
          <Text style={styles.item}>
            {formatMoney(targetSalaryBand.currency, targetSalaryBand.low)} –{" "}
            {formatMoney(targetSalaryBand.currency, targetSalaryBand.high)}
          </Text>

          <Text style={styles.provenance}>
            {targetSalaryBand.dataType.toLowerCase()} data
            {targetSalaryBand.source ? ` · ${targetSalaryBand.source}` : ""} ·{" "}
            {targetSalaryBand.confidence}% confidence
          </Text>
        </>
      ) : (
        <Text style={styles.provenance}>
          No verified market data available for this role yet.
        </Text>
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
