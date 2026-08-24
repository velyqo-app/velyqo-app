import OpenAI from "@openai/openai";
import "@supabase/functions-js/edge-runtime.d.ts";

const client = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return Response.json(
        {
          error: "Method not allowed",
        },
        {
          status: 405,
        }
      );
    }

    try {
      const { messages } = await req.json();

      if (!Array.isArray(messages) || messages.length === 0) {
        return Response.json(
          {
            error: "messages is required.",
          },
          {
            status: 400,
          }
        );
      }

      const response = await client.responses.create({
        model: "gpt-5-mini",
        input: messages,
      });

      return Response.json({
        reply: response.output_text,
      });
    } catch (error) {
      console.error(error);

      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unknown server error.",
        },
        {
          status: 500,
        }
      );
    }
  },
};