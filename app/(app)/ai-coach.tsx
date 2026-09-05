import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useProfile } from "../../hooks/useProfile";

import { getAIContext } from "../../services/aiContextService";

import Button from "../../components/ui/Button";

import ChatBubble from "../../components/ChatBubble";
import ChatInput from "../../components/ChatInput";
import TypingIndicator from "../../components/TypingIndicator";

import { Colors } from "../../constants/theme";
import { askAI } from "../../services/openaiService";

type Message = {
  text: string;
  isUser: boolean;
};

/** "a Nurse", "an Engineer" — picks the article from the role's first letter. */
function article(role: string): string {
  return /^[aeiou]/i.test(role) ? "an" : "a";
}

export default function AICoachScreen() {
  // Fetches independently rather than relying on an ancestor screen (e.g. the
  // dashboard) having already populated UserContext — otherwise a direct/hard
  // reload onto this screen renders the welcome message with blank fields.
  const { userData, error, reloadProfile } = useProfile();

  const { mission } = useLocalSearchParams<{
    mission?: string;
  }>();

  const welcomeMessage = mission
    ? `🎯 Today's Mission

${mission}

I'll help you complete today's mission.

Ask me anything about this topic and we'll work through it together.`
    : error
      ? `Hi there 👋

I couldn't load your profile just now, so I don't have your career details
handy. You can still ask me anything, or retry below.`
      : `Hi ${userData.name || "there"} 👋

I'm your Velyqo AI Career Coach.

I know you're currently ${article(userData.currentRole)} ${userData.currentRole}
and you're aiming to become ${article(userData.targetRole)} ${userData.targetRole}.

How can I help you today?`;

  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(false);

  const sendMessage = async (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        text: message,
        isUser: true,
      },
    ]);

    setLoading(true);

    const context = await getAIContext();

    const reply = await askAI({
      message,
      context,
    });

    setLoading(false);

    setMessages((prev) => [
      ...prev,
      {
        text: reply,
        isUser: false,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 AI Coach</Text>
      </View>

      <ScrollView
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
      >
        <ChatBubble message={welcomeMessage} isUser={false} />

        {error && (
          <View style={styles.retryContainer}>
            <Button title="Retry" onPress={reloadProfile} />
          </View>
        )}

        {messages.map((msg, index) => (
          <ChatBubble key={index} message={msg.text} isUser={msg.isUser} />
        ))}

        {loading && <TypingIndicator />}
      </ScrollView>

      <Button
        title="✅ Complete Mission"
        onPress={() => router.replace("/mission-complete")}
      />

      <ChatInput onSend={sendMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
  },

  chat: {
    flex: 1,
  },

  chatContent: {
    padding: 16,
    paddingBottom: 30,
  },

  retryContainer: {
    marginBottom: 16,
  },
});
