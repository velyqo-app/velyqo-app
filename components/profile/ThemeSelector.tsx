import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Radius, Spacing, type ThemeColors } from "../../constants/theme";
import { ThemePreference, useTheme, useThemedStyles } from "../../context/ThemeContext";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Profile's Light / Dark / System switch. Applies immediately and is
 * remembered on this device (ThemeContext persists it locally — never to
 * the backend). Same plain pill as Journey's Roadmap/Story switch, so it
 * reads as part of the app rather than a new control style.
 */
export default function ThemeSelector() {
  const styles = useThemedStyles(createStyles);
  const { preference, setPreference } = useTheme();

  return (
    <View>
      <View style={styles.container} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => {
          const selected = preference === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => setPreference(option.value)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} theme`}
            >
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.hint}>
        System follows your device&apos;s light or dark setting.
      </Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },

  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: "center",
  },

  segmentSelected: {
    backgroundColor: Colors.primary,
  },

  label: {
    color: Colors.subtext,
    fontSize: 14,
    fontWeight: "600",
  },

  labelSelected: {
    color: Colors.onPrimary,
  },

  hint: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
