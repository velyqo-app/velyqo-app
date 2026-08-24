import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export default function QuickActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={26} color={Colors.primary} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  iconContainer: {
    width: 48,
    alignItems: "center",
  },

  textContainer: {
    marginLeft: 14,
    flex: 1,
  },

  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
  },

  subtitle: {
    color: Colors.subtext,
    marginTop: 4,
    fontSize: 14,
  },
});
