import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UserContext } from "../context/UserContext";

export default function PurposeScreen() {
  const { userData, setUserData } = useContext(UserContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome {userData.name || "there"}!</Text>

      <Text
        style={{
          color: "#FFFFFF",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        What would you like Velyqo to help you with?
      </Text>

      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setUserData({
            ...userData,
            goal: "Advance my career",
          });

          router.push("/country");
        }}
      >
        <Text style={styles.optionText}>📈 Advance my career</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setUserData({
            ...userData,
            goal: "Change careers",
          });

          router.push("/country");
        }}
      >
        <Text style={styles.optionText}>🔄 Change careers</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setUserData({
            ...userData,
            goal: "Explore careers",
          });

          router.push("/country");
        }}
      >
        <Text style={styles.optionText}>🧭 Explore careers</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setUserData({
            ...userData,
            goal: "Increase my income",
          });

          router.push("/country");
        }}
      >
        <Text style={styles.optionText}>💰 Increase my income</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setUserData({
            ...userData,
            goal: "Plan my future",
          });

          router.push("/country");
        }}
      >
        <Text style={styles.optionText}>🚀 Plan my future</Text>
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
