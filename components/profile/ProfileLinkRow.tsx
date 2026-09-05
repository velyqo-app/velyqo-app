import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";
import Card from "../ui/Card";

interface Props {
  icon: string;
  title: string;
  subtitle: string;

  /** Omitted for sections with no behaviour yet (e.g. Preferences) — renders
   * as an inert row rather than a dead tappable one. */
  onPress?: () => void;
}

export default function ProfileLinkRow({
  icon,
  title,
  subtitle,
  onPress,
}: Props) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{icon}</Text>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  emoji: {
    fontSize: 24,
    marginRight: 14,
  },

  textBlock: {
    flex: 1,
  },

  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  subtitle: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: 2,
  },

  chevron: {
    color: Colors.subtext,
    fontSize: 22,
  },
});
