import { supabase } from "../lib/supabase";

export interface AIResult {
  text: string | null;
  error: string | null;
}

/**
 * Sends a single prompt to the deployed `ai-coach` edge function and returns
 * the raw reply.
 *
 * Unlike openaiService.askAI, this reports failure instead of substituting a
 * friendly sentence — callers that parse the response need to know the
 * difference between a real answer and an outage.
 */
export async function askAIRaw(prompt: string): Promise<AIResult> {
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
      return { text: null, error: error.message };
    }

    const reply = data?.reply;

    if (typeof reply !== "string" || !reply.trim()) {
      return { text: null, error: "Empty response from AI provider." };
    }

    return { text: reply, error: null };
  } catch (thrown) {
    return {
      text: null,
      error: thrown instanceof Error ? thrown.message : "Unknown AI error.",
    };
  }
}
