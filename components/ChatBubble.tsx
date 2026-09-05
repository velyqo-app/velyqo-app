import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import StructuredCoachResponse from "./coach/StructuredCoachResponse";
import { Colors, Radius, Spacing } from "../constants/theme";
import { parseCoachResponse } from "../services/coachResponseParser";

type Props = {
  message: string;
  isUser: boolean;

  /** True only for the handful of hardcoded failure replies askAI itself
   * returns — never set for a genuine (if unhelpful) AI answer. */
  isError?: boolean;

  /** Present only alongside isError — resends the original question. */
  onRetry?: () => void;
};

export default function ChatBubble({
  message,
  isUser,
  isError,
  onRetry,
}: Props) {
  // Only ever attempted for the coach's own replies — a user's typed
  // message is never parsed for section labels.
  const sections = !isUser ? parseCoachResponse(message) : null;

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      {sections ? (
        <StructuredCoachResponse sections={sections} />
      ) : (
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {message}
        </Text>
      )}

      {isError && onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "85%",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginVertical: 6,
  },

  userContainer: {
    backgroundColor: Colors.primary,
    alignSelf: "flex-end",
  },

  aiContainer: {
    backgroundColor: Colors.card,
    alignSelf: "flex-start",
  },

  text: {
    fontSize: 16,
    lineHeight: 22,
  },

  userText: {
    color: Colors.text,
  },

  aiText: {
    color: Colors.text,
  },

  retryRow: {
    marginTop: 10,
    alignSelf: "flex-start",
  },

  retryText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
