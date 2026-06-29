import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserContext } from "../context/UserContext";

import { salaryData } from "../data/salaries";

import { router } from "expo-router";

export default function SummaryScreen() {
  const { userData } = useContext(UserContext);
  const roleInfo =
    salaryData[userData.targetRole.toLowerCase() as keyof typeof salaryData];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Velyqo Profile</Text>

      <Text style={styles.item}>Name: {userData.name}</Text>

      <Text style={styles.item}>Goal: {userData.goal}</Text>

      <Text style={styles.item}>Country: {userData.country}</Text>

      <Text style={styles.item}>Current Role: {userData.currentRole}</Text>

      <Text style={styles.item}>Target Role: {userData.targetRole}</Text>

      {roleInfo && (
        <>
          <Text style={styles.item}>
            Average Salary: £{roleInfo.average.toLocaleString()}
          </Text>

          <Text style={styles.item}>
            Salary Range: £{roleInfo.min.toLocaleString()} - £
            {roleInfo.max.toLocaleString()}
          </Text>
        </>
      )}

      {roleInfo && userData.currentSalary && (
        <Text style={styles.item}>
          Potential Increase: £
          {(roleInfo.average - Number(userData.currentSalary)).toLocaleString()}
        </Text>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/timeline")}
      >
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
