import { router } from "expo-router";
import { useContext, useState } from "react";
import { useProfile } from "../../hooks/useProfile";

import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Colors } from "../../constants/theme";
import { UserContext } from "../../context/UserContext";
import { signOut } from "../../services/authService";

export default function ProfileScreen() {
  const { userData } = useProfile();

  const { clearUserData } = useContext(UserContext);

  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);

    const { error } = await signOut();

    if (error) {
      setSigningOut(false);
      Alert.alert("Sign Out Failed", error.message);
      return;
    }

    // Drop the previous user's details so they can't briefly show for whoever
    // signs in next.
    clearUserData();

    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <View style={styles.content}>
        <Card>
          <Text style={styles.name}>{userData.name || "Your Name"}</Text>

          <Text style={styles.goal}>
            {userData.targetRole || "Target Role"}
          </Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Current Role</Text>

          <Text style={styles.value}>{userData.currentRole || "Not Set"}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Current Salary</Text>

          <Text style={styles.value}>
            {userData.currentSalary
              ? `£${Number(userData.currentSalary).toLocaleString()}`
              : "Not Set"}
          </Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Career Goal</Text>

          <Text style={styles.value}>{userData.goal || "Not Set"}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Country</Text>

          <Text style={styles.value}>{userData.country || "Not Set"}</Text>
        </Card>

        <Card>
          <Button
            title={signingOut ? "Signing out..." : "Sign Out"}
            variant="secondary"
            disabled={signingOut}
            onPress={handleSignOut}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
  },

  content: {
    padding: 20,
  },

  name: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },

  goal: {
    color: Colors.primary,
    fontSize: 18,
    textAlign: "center",
    marginTop: 8,
  },

  sectionTitle: {
    color: Colors.subtext,
    fontSize: 14,
    marginBottom: 6,
  },

  value: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 18,
  },
});
