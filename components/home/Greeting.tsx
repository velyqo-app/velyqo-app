import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/theme";

interface Props {
  name: string;
}

/** Plain text, no card/border — sits directly on the background so the
 * screen opens with a person, not a box. */
export default function Greeting({ name }: Props) {
  const hour = new Date().getHours();

  let greeting = "Good evening";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {greeting}, {name || "there"} 👋
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  greeting: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
});
