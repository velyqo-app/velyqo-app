import { useCallback, useState } from "react";
import {
  LayoutAnimation,
  StyleProp,
  StyleSheet,
  Text,
  TextLayoutEventData,
  NativeSyntheticEvent,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import type { ThemeColors } from "../../constants/theme";
import { useThemedStyles } from "../../context/ThemeContext";

/**
 * VELYQO's one progressive-disclosure pattern ("never hide the action, hide
 * the explanation"), extracted from MilestoneCard's original expand/collapse
 * so every surface behaves and looks the same. Deliberately tiny: an
 * open/closed state, one text toggle, and a clamped-text helper — not an
 * accordion system. Callers decide what stays visible; only supporting
 * explanation should ever sit behind a toggle.
 */
export function useDisclosure(initiallyExpanded = false) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  }, []);

  return { expanded, toggle };
}

interface ToggleProps {
  expanded: boolean;
  onPress: () => void;
  /** Collapsed-state label. Defaults to "Show details". */
  showLabel?: string;
  /** Expanded-state label. Defaults to "Show less". */
  hideLabel?: string;
  /** Layout overrides only (e.g. centring inside a centred card). */
  style?: StyleProp<ViewStyle>;
}

/** The text button that opens/closes a disclosure. Its own touch target, so
 * it works inside an otherwise-tappable card without firing the card. */
export function DisclosureToggle({
  expanded,
  onPress,
  showLabel = "Show details",
  hideLabel = "Show less",
  style,
}: ToggleProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toggle, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <Text style={styles.toggleText}>{expanded ? hideLabel : showLabel}</Text>
    </TouchableOpacity>
  );
}

interface ExpandableTextProps {
  text: string;
  /** Lines shown while collapsed. */
  numberOfLines: number;
  style?: StyleProp<TextStyle>;
  showLabel?: string;
  hideLabel?: string;
}

/**
 * A paragraph clamped to `numberOfLines`, with a toggle only when the text
 * genuinely runs longer — short text is shown whole, with no pointless
 * "Read more". The full text is measured by an invisible twin (hidden from
 * screen readers) so the decision is exact on every device and font size.
 */
export function ExpandableText({
  text,
  numberOfLines,
  style,
  showLabel,
  hideLabel,
}: ExpandableTextProps) {
  const styles = useThemedStyles(createStyles);
  const { expanded, toggle } = useDisclosure();
  const [fullLineCount, setFullLineCount] = useState<number | null>(null);

  const handleMeasure = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      setFullLineCount(event.nativeEvent.lines.length);
    },
    [],
  );

  const overflows = fullLineCount !== null && fullLineCount > numberOfLines;

  return (
    <View>
      <View
        style={styles.measure}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={style} onTextLayout={handleMeasure}>
          {text}
        </Text>
      </View>

      <Text style={style} numberOfLines={expanded ? undefined : numberOfLines}>
        {text}
      </Text>

      {overflows && (
        <DisclosureToggle
          expanded={expanded}
          onPress={toggle}
          showLabel={showLabel}
          hideLabel={hideLabel}
        />
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  toggle: {
    marginTop: 10,
    alignSelf: "flex-start",
  },

  toggleText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  measure: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
  },
});
