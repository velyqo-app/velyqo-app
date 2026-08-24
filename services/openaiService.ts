import { supabase } from "../lib/supabase";
import { AIContext } from "../types/ai";
import { buildCoachPrompt } from "./promptBuilderService";

interface AskAIRequest {
  message: string;
  context: AIContext | null;
}

export async function askAI({
  message,
  context,
}: AskAIRequest): Promise<string> {
  if (!context) {
    return "I'm your Velyqo Career Coach. I couldn't load your career profile right now, but I'm here to help.";
  }

  const prompt = buildCoachPrompt(context, message);

  try {
    const { data, error } = await supabase.functions.invoke("ai-coach", {
      body: {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
    });

    if (error) {
      console.error("AI Coach Error:", error);
      return "Sorry, I couldn't reach your AI Career Coach right now. Please try again in a moment.";
    }

    if (!data?.reply) {
      return "The AI Coach didn't return a response.";
    }

    return data.reply;
  } catch (error) {
    console.error("AI Coach Exception:", error);

    return "Something went wrong while contacting your AI Career Coach.";
  }
}