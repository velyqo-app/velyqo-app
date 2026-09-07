import { ScrollView, StyleSheet, Text, View } from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";
import { Colors, Spacing } from "../../constants/theme";
import { CATEGORY_LABELS, SELECTABLE_CATEGORIES } from "../../hooks/useCareerCheckin";
import { CareerCheckinCategory } from "../../types/careerCheckin";

interface Props {
  selected: Set<CareerCheckinCategory>;
  onToggle: (category: CareerCheckinCategory) => void;
  onContinue: () => void;
  canContinue: boolean;
}

/**
 * Multi-select category list. "Nothing meaningful has changed" is rendered
 * separately, below a divider, and is mutually exclusive with the other
 * four (enforced by useCareerCheckin.toggleCategory) — selecting it clears
 * everything else and vice versa, matching the approved requirement that
 * it stand alone.
 */
export default function CheckinCategoryStep({
  selected,
  onToggle,
  onContinue,
  canContinue,
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.prompt}>What&apos;s changed?</Text>
      <Text style={styles.hint}>Select everything that applies.</Text>

      {SELECTABLE_CATEGORIES.map((category) => {
        const isSelected = selected.has(category);

        return (
          <Card key={category} onPress={() => onToggle(category)}>
            <View style={styles.row}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>

              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {CATEGORY_LABELS[category]}
              </Text>
            </View>
          </Card>
        );
      })}

      <View style={styles.divider} />

      <Card onPress={() => onToggle("no_change")}>
        <View style={styles.row}>
          <View
            style={[
              styles.checkbox,
              selected.has("no_change") && styles.checkboxSelected,
            ]}
          >
            {selected.has("no_change") && <Text style={styles.checkmark}>✓</Text>}
          </View>

          <Text
            style={[
              styles.label,
              selected.has("no_change") && styles.labelSelected,
            ]}
          >
            {CATEGORY_LABELS.no_change}
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button title="Continue" onPress={onContinue} disabled={!canContinue} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  prompt: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },

  hint: {
    color: Colors.subtext,
    fontSize: 14,
    marginBottom: Spacing.lg,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },

  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  checkmark: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  label: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontWeight: "500",
  },

  labelSelected: {
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  actions: {
    marginTop: Spacing.lg,
  },
});
