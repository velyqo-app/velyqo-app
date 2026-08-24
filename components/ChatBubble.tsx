import { StyleSheet, Text, View } from "react-native";

type Props = {
  message: string;
  isUser: boolean;
};

export default function ChatBubble({ message, isUser }: Props) {
  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "80%",
    padding: 14,
    borderRadius: 16,
    marginVertical: 6,
  },

  userContainer: {
    backgroundColor: "#7C3AED",
    alignSelf: "flex-end",
  },

  aiContainer: {
    backgroundColor: "#1E293B",
    alignSelf: "flex-start",
  },

  text: {
    fontSize: 16,
  },

  userText: {
    color: "#FFFFFF",
  },

  aiText: {
    color: "#FFFFFF",
  },
});
