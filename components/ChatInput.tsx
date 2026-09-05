import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors, Radius } from "../constants/theme";

type Props = {
  onSend: (message: string) => void;

  /** True while a request is already in flight — prevents a second message
   * from being sent before the first one resolves. */
  disabled?: boolean;
};

export default function ChatInput({ onSend, disabled }: Props) {
  const [message, setMessage] = useState("");

  const send = () => {
    if (!message.trim() || disabled) return;

    onSend(message);

    setMessage("");
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Ask your Career Coach..."
        placeholderTextColor={Colors.subtext}
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        multiline
        editable={!disabled}
      />

      <TouchableOpacity
        style={[
          styles.button,
          (disabled || !message.trim()) && styles.buttonDisabled,
        ]}
        onPress={send}
        disabled={disabled || !message.trim()}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  input: {
    flex: 1,
    backgroundColor: Colors.card,
    color: Colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    marginRight: 12,
    maxHeight: 120,
  },

  button: {
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: Colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
});
