import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Colors, Radius } from "../constants/theme";
import { Occupation } from "../types/occupation";

interface OccupationAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  results: Occupation[];
  loading: boolean;
  onChangeText: (text: string) => void;
  onSelect: (occupation: Occupation) => void;
}

export default function OccupationAutocomplete({
  label,
  placeholder,
  value,
  results,
  loading,
  onChangeText,
  onSelect,
}: OccupationAutocompleteProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        placeholderTextColor={Colors.subtext}
        style={styles.input}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={results}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.item} onPress={() => onSelect(item)}>
              <Text style={styles.title}>{item.title}</Text>

              <Text style={styles.subtitle}>
                {item.category}
                {item.level ? ` • ${item.level}` : ""}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
  },

  label: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.card,
    color: Colors.text,
  },

  loadingContainer: {
    marginTop: 12,
    alignItems: "center",
  },

  list: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    maxHeight: 220,
    backgroundColor: Colors.card,
  },

  item: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },

  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.subtext,
  },
});
