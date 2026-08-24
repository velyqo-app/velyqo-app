import { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  onSend: (message: string) => void;
};

export default function ChatInput({ onSend }: Props) {
  const [message, setMessage] = useState("");

  const send = () => {
    if (!message.trim()) return;

    onSend(message);

    setMessage("");
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Ask your AI Career Coach..."
        placeholderTextColor="#94A3B8"
        style={styles.input}
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity style={styles.button} onPress={send}>
        <Text style={styles.buttonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#0B1120",
  },

  input: {
    flex: 1,
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
  },

  button: {
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
