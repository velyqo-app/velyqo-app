import { router } from "expo-router";
import { useProfile } from "../../hooks/useProfile";

import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Card from "../../components/ui/Card";
import { Colors } from "../../constants/theme";

export default function ProfileScreen() {
  const { userData } = useProfile();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Career Brief</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Profile</Text>

        <View style={{ width: 90 }} />
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

  back: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
    width: 90,
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
