import OpenAI from "@openai/openai";
import "@supabase/functions-js/edge-runtime.d.ts";

const client = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

/**
 * Origins allowed to call this function from a browser.
 *
 * Expo web serves on 8081 in development; 19006 covers the older default.
 * Add the production web origin here when the app is deployed. Native builds
 * are unaffected — CORS is a browser mechanism only.
 */
const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
];

/**
 * Echoes the caller's origin when it is allowed.
 *
 * The origin is echoed rather than sent as "*" because the app calls this with
 * an Authorization header, and a wildcard cannot be combined with credentialed
 * requests in every browser. An unknown origin gets no CORS headers at all, so
 * the browser blocks it — which is the intended behaviour.
 */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export default {
  async fetch(req: Request): Promise<Response> {
    const cors = corsHeaders(req);

    // The browser sends this before the real POST because the request carries
    // Authorization and Content-Type headers. It must be answered before the
    // method check below, which would otherwise reject it with a 405 and cause
    // the browser to block the POST that follows.
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors,
      });
    }

    if (req.method !== "POST") {
      return Response.json(
        {
          error: "Method not allowed",
        },
        {
          status: 405,
          headers: cors,
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
            headers: cors,
          }
        );
      }

      const response = await client.responses.create({
        model: "gpt-5-mini",
        input: messages,
      });

      return Response.json(
        {
          reply: response.output_text,
        },
        {
          headers: cors,
        }
      );
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
          headers: cors,
        }
      );
    }
  },
};
