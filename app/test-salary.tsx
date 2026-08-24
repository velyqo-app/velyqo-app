import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getSalaryBands, SalaryBand } from "../services/salaryService";

export default function TestSalaryScreen() {
  const [salaryBands, setSalaryBands] = useState<SalaryBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSalary = async () => {
      setLoading(true);
      setError(null);

      const { data, error: salaryError } = await getSalaryBands(
        "d4bbfb24-9f22-4419-b18d-e534ecde6b2c",
        "GB",
      );

      if (salaryError) {
        setError(salaryError.message);
        setLoading(false);
        return;
      }

      setSalaryBands((data ?? []) as SalaryBand[]);
      setLoading(false);
    };

    loadSalary();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Loading salary data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Salary data error</Text>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Salary Test</Text>

      <Text style={styles.subtitle}>Metrology Engineer • United Kingdom</Text>

      {salaryBands.length === 0 ? (
        <Text style={styles.message}>No salary data found.</Text>
      ) : (
        salaryBands.map((band) => (
          <View key={band.id} style={styles.card}>
            <Text style={styles.label}>Scope</Text>
            <Text style={styles.value}>{band.scope}</Text>

            <Text style={styles.label}>Low</Text>
            <Text style={styles.value}>
              £{band.low_salary.toLocaleString()}
            </Text>

            <Text style={styles.label}>Median</Text>
            <Text style={styles.value}>
              £{band.median_salary.toLocaleString()}
            </Text>

            <Text style={styles.label}>High</Text>
            <Text style={styles.value}>
              £{band.high_salary.toLocaleString()}
            </Text>

            <Text style={styles.label}>Confidence</Text>
            <Text style={styles.value}>{band.confidence}%</Text>

            <Text style={styles.label}>Data Type</Text>
            <Text style={styles.value}>{band.data_type}</Text>

            <Text style={styles.label}>Source</Text>
            <Text style={styles.value}>{band.source ?? "Unknown"}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#0B1120",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0B1120",
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 16,
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  label: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 10,
  },

  value: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 2,
  },

  message: {
    color: "#CBD5E1",
    marginTop: 12,
  },

  errorTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },

  error: {
    color: "#FCA5A5",
    textAlign: "center",
  },
});
