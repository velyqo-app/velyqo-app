import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Colors, Radius } from "../constants/theme";

const MAX_SKILLS = 10;
const RECOMMENDED_MIN = 5;
const RECOMMENDED_MAX = 8;

interface Props {
  suggested: string[];
  allKnown: string[];
  selected: string[];
  onChange: (skills: string[]) => void;
}

export default function SkillSelector({
  suggested,
  allKnown,
  selected,
  onChange,
}: Props) {
  const [query, setQuery] = useState("");

  const atLimit = selected.length >= MAX_SKILLS;

  const toggle = (skill: string) => {
    if (selected.includes(skill)) {
      onChange(selected.filter((item) => item !== skill));
      return;
    }

    if (atLimit) {
      return;
    }

    onChange([...selected, skill]);
  };

  // Suggestions the user hasn't already picked, so the list doesn't repeat
  // itself once someone starts selecting.
  const suggestionChips = useMemo(
    () => suggested.filter((skill) => !selected.includes(skill)),
    [suggested, selected],
  );

  const trimmedQuery = query.trim();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }

    const lower = trimmedQuery.toLowerCase();

    return allKnown.filter(
      (skill) =>
        skill.toLowerCase().includes(lower) && !selected.includes(skill),
    );
  }, [allKnown, trimmedQuery, selected]);

  // Only offer "add" for something genuinely not already in the known list —
  // otherwise typing "Communication" would offer to add a duplicate of the
  // suggestion right below it.
  const canAddTyped =
    trimmedQuery.length > 0 &&
    !allKnown.some((skill) => skill.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !selected.some((skill) => skill.toLowerCase() === trimmedQuery.toLowerCase());

  const addTyped = () => {
    if (!canAddTyped || atLimit) {
      return;
    }

    onChange([...selected, trimmedQuery]);
    setQuery("");
  };

  return (
    <View>
      {selected.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Selected ({selected.length}/10)</Text>

          <View style={styles.chipRow}>
            {selected.map((skill) => (
              <TouchableOpacity
                key={skill}
                style={[styles.chip, styles.chipSelected]}
                onPress={() => toggle(skill)}
              >
                <Text style={styles.chipTextSelected}>{skill} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selected.length < RECOMMENDED_MIN && (
            <Text style={styles.hint}>
              Aim for around {RECOMMENDED_MIN}–{RECOMMENDED_MAX} skills.
            </Text>
          )}
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Search or add a skill..."
        placeholderTextColor={Colors.subtext}
        value={query}
        onChangeText={setQuery}
        editable={!atLimit}
      />

      {atLimit && (
        <Text style={styles.hint}>
          You&apos;ve reached the {MAX_SKILLS}-skill limit. Remove one above to
          add another.
        </Text>
      )}

      {trimmedQuery.length > 0 ? (
        <View style={styles.section}>
          {searchResults.map((skill) => (
            <TouchableOpacity
              key={skill}
              style={styles.chip}
              onPress={() => toggle(skill)}
              disabled={atLimit}
            >
              <Text style={styles.chipText}>{skill}</Text>
            </TouchableOpacity>
          ))}

          {canAddTyped && (
            <TouchableOpacity
              style={[styles.chip, styles.chipAdd]}
              onPress={addTyped}
              disabled={atLimit}
            >
              <Text style={styles.chipText}>+ Add &quot;{trimmedQuery}&quot;</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        suggestionChips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Suggested for you</Text>

            <View style={styles.chipRow}>
              {suggestionChips.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={styles.chip}
                  onPress={() => toggle(skill)}
                  disabled={atLimit}
                >
                  <Text style={styles.chipText}>{skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },

  sectionLabel: {
    color: Colors.subtext,
    fontSize: 13,
    marginBottom: 10,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 10,
  },

  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  chipAdd: {
    borderColor: Colors.primary,
    borderStyle: "dashed",
  },

  chipText: {
    color: Colors.text,
    fontSize: 14,
  },

  chipTextSelected: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  input: {
    backgroundColor: Colors.card,
    color: Colors.text,
    padding: 16,
    borderRadius: Radius.md,
    fontSize: 16,
    marginTop: 16,
  },

  hint: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 10,
  },
});
