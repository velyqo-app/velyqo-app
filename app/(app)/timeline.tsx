import { router } from "expo-router";
import { useContext } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Card from "../../components/ui/Card";
import { Colors } from "../../constants/theme";
import { UserContext } from "../../context/UserContext";
import { careerData } from "../../data/careerData";
import { getIndicativeSalary } from "../../data/salaries";

export default function TimelineScreen() {
  const { userData } = useContext(UserContext);

  const roleKey = userData.targetRole.toLowerCase();

  const roleData = careerData[roleKey as keyof typeof careerData];

  const salary = getIndicativeSalary(userData.targetRole, userData.country);

  const roadmap = roleData?.roadmap || [
    { step: "Learn key skills", time: "1-2 months" },
    { step: "Complete certifications", time: "2-4 months" },
    { step: "Build practical experience", time: "3-6 months" },
    { step: "Apply for opportunities", time: "1-3 months" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Career Brief</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Career Timeline</Text>

        <View style={{ width: 90 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.currentRole}>{userData.currentRole}</Text>

        <Text style={styles.arrow}>↓</Text>

        <Text style={styles.targetRole}>{userData.targetRole}</Text>

        {salary && (
          <Card>
            <Text style={styles.cardTitle}>Expected Salary</Text>

            <Text style={styles.salary}>
              £{salary.average.toLocaleString()}
            </Text>

            <Text style={styles.range}>
              £{salary.min.toLocaleString()} - £{salary.max.toLocaleString()}
            </Text>

            <Text style={styles.provenance}>
              Indicative UK market estimate, not a figure specific to you.
            </Text>
          </Card>
        )}

        {roleData && (
          <Card>
            <Text style={styles.cardTitle}>Skills To Develop</Text>

            {roleData.skills.map((skill, index) => (
              <Text key={index} style={styles.skill}>
                ✓ {skill}
              </Text>
            ))}
          </Card>
        )}

        <Text style={styles.section}>Career Roadmap</Text>

        {roadmap.map((item, index) => (
          <View key={index} style={styles.stepContainer}>
            <Card>
              <Text style={styles.stepNumber}>STEP {index + 1}</Text>

              <Text style={styles.step}>{item.step}</Text>

              <Text style={styles.time}>⏱ {item.time}</Text>
            </Card>

            {index < roadmap.length - 1 && <Text style={styles.arrow}>↓</Text>}
          </View>
        ))}

        {salary &&
          userData.targetSalary &&
          Number(userData.targetSalary) > salary.max && (
            <>
              <Text style={styles.section}>Future Career Path</Text>

              <Card>
                {salary.nextRoles.map((role, index) => (
                  <Text key={index} style={styles.skill}>
                    • {role}
                  </Text>
                ))}
              </Card>
            </>
          )}
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
    paddingBottom: 40,
  },

  currentRole: {
    color: Colors.subtext,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
  },

  targetRole: {
    color: Colors.success,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
  },

  arrow: {
    color: Colors.primary,
    fontSize: 28,
    textAlign: "center",
    marginVertical: 10,
  },

  cardTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
  },

  salary: {
    color: Colors.success,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },

  range: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 10,
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 14,
  },

  skill: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 10,
  },

  section: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    marginTop: 10,
  },

  stepContainer: {
    marginBottom: 10,
  },

  stepNumber: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  step: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
  },

  time: {
    color: Colors.subtext,
    marginTop: 12,
  },
});
