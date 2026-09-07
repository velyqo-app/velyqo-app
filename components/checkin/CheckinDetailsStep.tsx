import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";
import { Colors, Spacing } from "../../constants/theme";
import { CareerCheckinCategory } from "../../types/careerCheckin";

interface DetailDraft {
  description: string;
  structuredValue: string;
}

interface Props {
  categories: Exclude<CareerCheckinCategory, "no_change">[];
  details: Partial<Record<CareerCheckinCategory, DetailDraft>>;
  onChangeField: (
    category: CareerCheckinCategory,
    field: "description" | "structuredValue",
    value: string,
  ) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  submitting: boolean;
  error: string | null;
}

interface CategoryMeta {
  heading: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  structuredLabel?: string;
  structuredPlaceholder?: string;
}

const CATEGORY_META: Record<Exclude<CareerCheckinCategory, "no_change">, CategoryMeta> = {
  role_change: {
    heading: "Your role or responsibilities",
    descriptionLabel: "What happened?",
    descriptionPlaceholder: "e.g. Took on leading the platform team",
    structuredLabel: "New role title (optional)",
    structuredPlaceholder: "e.g. Engineering Team Lead",
  },
  new_evidence: {
    heading: "What you achieved",
    descriptionLabel: "What did you do?",
    descriptionPlaceholder: "e.g. Led a major project to launch",
  },
  new_skill: {
    heading: "What you learned",
    descriptionLabel: "What happened?",
    descriptionPlaceholder: "e.g. Completed a certification",
    structuredLabel: "Skill name (optional)",
    structuredPlaceholder: "e.g. Kubernetes",
  },
  target_change: {
    heading: "Your target",
    descriptionLabel: "What's changing?",
    descriptionPlaceholder: "e.g. Thinking about moving into management",
    structuredLabel: "New target role (optional)",
    structuredPlaceholder: "e.g. Engineering Manager",
  },
};

const EMPTY_DRAFT: DetailDraft = { description: "", structuredValue: "" };

/** One short required field + one optional structured field per selected
 * category — the minimum useful follow-up, per the approved design. The
 * optional field is what lets interpretCareerCheckin produce a
 * deterministic proposal immediately; leaving it blank simply means Review
 * will show that report as unresolved, never a dead end. */
export default function CheckinDetailsStep({
  categories,
  details,
  onChangeField,
  onBack,
  onContinue,
  canContinue,
  submitting,
  error,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {categories.map((category) => {
          const meta = CATEGORY_META[category];
          const draft = details[category] ?? EMPTY_DRAFT;

          return (
            <Card key={category}>
              <Text style={styles.heading}>{meta.heading}</Text>

              <Text style={styles.fieldLabel}>{meta.descriptionLabel}</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={draft.description}
                onChangeText={(text) =>
                  onChangeField(category, "description", text)
                }
                placeholder={meta.descriptionPlaceholder}
                placeholderTextColor={Colors.subtext}
              />

              {meta.structuredLabel && (
                <>
                  <Text style={styles.fieldLabel}>{meta.structuredLabel}</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.structuredValue}
                    onChangeText={(text) =>
                      onChangeField(category, "structuredValue", text)
                    }
                    placeholder={meta.structuredPlaceholder}
                    placeholderTextColor={Colors.subtext}
                    returnKeyType="done"
                  />
                </>
              )}
            </Card>
          );
        })}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          <Button
            title={submitting ? "Saving..." : "Continue"}
            onPress={onContinue}
            disabled={!canContinue || submitting}
          />

          <View style={styles.backSpacing}>
            <Button
              title="Back"
              variant="secondary"
              onPress={onBack}
              disabled={submitting}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  heading: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },

  fieldLabel: {
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: Spacing.sm,
  },

  textArea: {
    backgroundColor: Colors.background,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },

  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },

  error: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  actions: {
    marginTop: Spacing.md,
  },

  backSpacing: {
    marginTop: Spacing.sm,
  },
});
