import OpenAI from "@openai/openai";
import "@supabase/functions-js/edge-runtime.d.ts";
// Fully qualified rather than mapped: this function's deno.json has no
// @supabase/supabase-js entry. Same package and range as delete-account's map.
import { createClient } from "npm:@supabase/supabase-js@^2";

const client = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // Every request that reaches OpenAI is billed to this project, so the
    // caller must be a signed-in user. verify_jwt = true (supabase/config.toml)
    // already rejects requests without a valid JWT, but the project's legacy
    // anon key is also a valid JWT, so the user is re-derived here — mirroring
    // delete-account/index.ts. Nothing below this check runs without one, and
    // neither the token nor the auth error is logged or returned.
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return Response.json(
        { error: "Missing Authorization header." },
        { status: 401, headers: cors }
      );
    }

    try {
      const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: userError,
      } = await callerClient.auth.getUser();

      if (userError || !user) {
        return Response.json(
          { error: "Not authenticated." },
          { status: 401, headers: cors }
        );
      }

      // An anonymous sign-in is a real session with a valid JWT, so it passes
      // both checks above. Reject it explicitly, whatever the project's
      // anonymous sign-in setting is, so only registered users reach OpenAI.
      if (user.is_anonymous === true) {
        return Response.json(
          { error: "A registered account is required." },
          { status: 403, headers: cors }
        );
      }
    } catch {
      console.error("ai-coach: could not verify the caller's session.");

      return Response.json(
        { error: "Could not verify your session. Please try again." },
        { status: 500, headers: cors }
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
