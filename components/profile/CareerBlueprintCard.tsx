import { StyleSheet, Text } from "react-native";

import { Colors } from "../../constants/theme";
import {
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  SALARY_PRIORITY_LABELS,
  SalaryPriority,
  TARGET_TIMEFRAME_LABELS,
  TargetTimeframe,
} from "../../types/careerContext";
import Card from "../ui/Card";
import BlueprintField from "./BlueprintField";

interface Props {
  currentRole: string;
  currentSalary: string;
  experienceLevel: ExperienceLevel | "";
  skills: string[];
  targetRole: string;
  targetSalary: string;
  targetTimeframe: TargetTimeframe | "";

  /** Null means no Destination Decision has ever been made for this target —
   * genuinely never asked, not defaulted — since no verified salary conflict
   * was found. Distinct from any SalaryPriority value. */
  priority: SalaryPriority | null;
}

function formatMoney(value: string): string {
  return value ? `£${Number(value).toLocaleString()}` : "Not set";
}

export default function CareerBlueprintCard({
  currentRole,
  currentSalary,
  experienceLevel,
  skills,
  targetRole,
  targetSalary,
  targetTimeframe,
  priority,
}: Props) {
  return (
    <Card>
      <Text style={styles.title}>Career Blueprint</Text>

      <BlueprintField label="Current Role" value={currentRole || "Not set"} />

      <BlueprintField
        label="Current Salary"
        value={formatMoney(currentSalary)}
      />

      <BlueprintField
        label="Experience Level"
        value={
          experienceLevel ? EXPERIENCE_LEVEL_LABELS[experienceLevel] : "Not set"
        }
      />

      <BlueprintField
        label="Skills"
        value={skills.length > 0 ? skills.join(", ") : "None added yet"}
      />

      <BlueprintField label="Target Role" value={targetRole || "Not set"} />

      <BlueprintField
        label="Target Salary"
        value={formatMoney(targetSalary)}
      />

      <BlueprintField
        label="Target Timeframe"
        value={
          targetTimeframe ? TARGET_TIMEFRAME_LABELS[targetTimeframe] : "Not set"
        }
      />

      <BlueprintField
        label="Priority"
        value={
          priority
            ? SALARY_PRIORITY_LABELS[priority]
            : "Not applicable yet — no salary trade-off has come up for this target"
        }
        last
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
});
