import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { useProfile } from "../../hooks/useProfile";

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Colors } from "../../constants/theme";
import { UserContext } from "../../context/UserContext";
import { signOut } from "../../services/authService";

import CareerBlueprintCard from "../../components/profile/CareerBlueprintCard";
import ProfileLinkRow from "../../components/profile/ProfileLinkRow";

import { getStoredPriority } from "../../hooks/useRoadmap";
import { SalaryPriority } from "../../types/careerContext";

export default function ProfileScreen() {
  const { userData } = useProfile();

  const { clearUserData } = useContext(UserContext);

  const [signingOut, setSigningOut] = useState(false);

  // Read-only, local-only lookup — never triggers the salary-conflict check
  // itself, just reflects a decision already made (if any) on Journey.
  const [priority, setPriority] = useState<SalaryPriority | null>(null);

  useEffect(() => {
    let active = true;

    getStoredPriority(userData).then((result) => {
      if (active) {
        setPriority(result);
      }
    });

    return () => {
      active = false;
    };
  }, [userData]);

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.name}>{userData.name || "Your Name"}</Text>

        <CareerBlueprintCard
          currentRole={userData.currentRole}
          currentSalary={userData.currentSalary}
          experienceLevel={userData.experienceLevel}
          skills={userData.skills}
          targetRole={userData.targetRole}
          targetSalary={userData.targetSalary}
          targetTimeframe={userData.targetTimeframe}
          priority={priority}
        />

        <ProfileLinkRow
          icon="📖"
          title="Career Journal"
          subtitle="Your milestones and completed missions"
          onPress={() => router.push("/career-journal")}
        />

        <ProfileLinkRow
          icon="⚙️"
          title="Preferences"
          subtitle="Coming soon"
        />

        <ProfileLinkRow
          icon="❓"
          title="Help & Support"
          subtitle="Coming soon"
        />

        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <Card>
          <Button
            title={signingOut ? "Signing out..." : "Sign Out"}
            variant="secondary"
            disabled={signingOut}
            onPress={handleSignOut}
          />
        </Card>
      </ScrollView>
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
    paddingBottom: 40,
  },

  name: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },

  sectionLabel: {
    color: Colors.subtext,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },
});
