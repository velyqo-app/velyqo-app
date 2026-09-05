import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors, Radius } from "../../constants/theme";

interface Props {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

/** Tapping a suggestion sends it immediately, the way a messaging app's
 * quick-reply chips do — there is no intermediate "populate then send"
 * step, since that would just be an extra tap for no benefit. */
export default function SuggestedQuestions({
  questions,
  onSelect,
  disabled,
}: Props) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {questions.map((question) => (
        <TouchableOpacity
          key={question}
          style={[styles.chip, disabled && styles.chipDisabled]}
          onPress={() => onSelect(question)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{question}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 8,
  },

  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  chipDisabled: {
    opacity: 0.5,
  },

  chipText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
