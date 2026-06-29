import { useContext } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { UserContext } from "../context/UserContext";
import { careerData } from "../data/careerData";
import { salaryData } from "../data/salaries";

export default function TimelineScreen() {
  const { userData } = useContext(UserContext);

  const roleKey = userData.targetRole.toLowerCase();

  const roleData = careerData[roleKey as keyof typeof careerData];

  const salary = salaryData[roleKey as keyof typeof salaryData];

  const roadmap = roleData?.roadmap || [
    { step: "Learn key skills", time: "1-2 months" },
    { step: "Complete certifications", time: "2-4 months" },
    { step: "Build practical experience", time: "3-6 months" },
    { step: "Apply for opportunities", time: "1-3 months" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Career Roadmap</Text>

      <Text style={styles.subtitle}>{userData.currentRole}</Text>

      <Text style={styles.arrow}>↓</Text>

      <Text style={styles.goal}>{userData.targetRole}</Text>

      {salary && (
        <View style={styles.salaryCard}>
          <Text style={styles.salaryTitle}>Expected Salary</Text>

          <Text style={styles.salaryAmount}>
            £{salary.average.toLocaleString()}
          </Text>

          <Text style={styles.salaryRange}>
            Range: £{salary.min.toLocaleString()} - £
            {salary.max.toLocaleString()}
          </Text>
        </View>
      )}

      {roleData && (
        <>
          <Text style={styles.skillsTitle}>Skills You Need To Develop</Text>

          {roleData.skills.map((skill, index) => (
            <Text key={index} style={styles.skill}>
              ✓ {skill}
            </Text>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Your Roadmap</Text>

      {roadmap.map((item, index) => (
        <View
          key={index}
          style={{
            width: "100%",
            alignItems: "center",
          }}
        >
          <View style={styles.card}>
            <Text style={styles.stepNumber}>STEP {index + 1}</Text>

            <Text style={styles.step}>{item.step}</Text>

            <Text style={styles.time}>⏱ {item.time}</Text>
          </View>

          {index < roadmap.length - 1 && <Text style={styles.arrow}>↓</Text>}
        </View>
      ))}

      {salary && userData.targetSalary
        ? Number(userData.targetSalary) > salary.max && (
            <>
              <Text style={styles.sectionTitle}>
                To reach £{Number(userData.targetSalary).toLocaleString()}
              </Text>

              {salary.nextRoles.map((role, index) => (
                <Text key={index} style={styles.skill}>
                  • {role}
                </Text>
              ))}
            </>
          )
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },

  content: {
    padding: 24,
    alignItems: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
  },

  subtitle: {
    color: "#A78BFA",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  goal: {
    color: "#10B981",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 25,
    textAlign: "center",
  },

  salaryCard: {
    backgroundColor: "#1E293B",
    width: "100%",
    padding: 18,
    borderRadius: 14,
    marginBottom: 30,
  },

  salaryTitle: {
    color: "#A78BFA",
    fontSize: 16,
    textAlign: "center",
  },

  salaryAmount: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 8,
  },

  salaryRange: {
    color: "#94A3B8",
    textAlign: "center",
  },

  skillsTitle: {
    color: "#10B981",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },

  skill: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 30,
    marginBottom: 20,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#1E293B",
    width: "100%",
    padding: 18,
    borderRadius: 14,
    marginBottom: 10,
  },

  stepNumber: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },

  step: {
    color: "#FFFFFF",
    fontSize: 18,
    textAlign: "center",
  },

  time: {
    color: "#94A3B8",
    marginTop: 10,
    textAlign: "center",
  },

  arrow: {
    color: "#7C3AED",
    fontSize: 30,
    marginVertical: 8,
    textAlign: "center",
  },
});
