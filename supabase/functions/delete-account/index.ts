import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

/**
 * Phase 18 — Account deletion.
 *
 * Deletes the CALLING user's own account and every row they own — never a
 * client-supplied id. The caller's identity is derived exclusively from
 * their own Authorization token: verified once by the platform's own
 * verify_jwt gate (supabase/config.toml, verify_jwt = true for this
 * function) before this code ever runs, and again here via a client scoped
 * to that same token calling auth.getUser() — the resulting user id is the
 * only one this function ever acts on.
 *
 * All privileged writes then run through a SEPARATE service-role client.
 * The service-role key is read only from this function's own server-side
 * environment (SUPABASE_SERVICE_ROLE_KEY, injected automatically by
 * Supabase into every Edge Function) — it is never returned to the caller
 * and never present anywhere in the app's own code.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Origins allowed to call this function from a browser — mirrors
 * ai-coach/index.ts's own list exactly. Native builds are unaffected; CORS
 * is a browser-only mechanism.
 */
const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
];

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

/**
 * Every user_id-scoped table this app currently has, cleared explicitly and
 * defensively before the auth user itself is deleted. Every
 * migration-tracked table here already has
 * `user_id uuid not null references auth.users(id) on delete cascade`
 * (see supabase/migrations/), which makes this provably redundant for
 * those four — but profiles/user_progress/career_journal predate this
 * repo's tracked migration history, and their cascade behaviour cannot be
 * confirmed from code alone. Explicit deletes make this correct either way
 * without touching schema. Children are listed before parents so this
 * still holds even if that cascade assumption is ever wrong.
 */
const USER_SCOPED_TABLES = [
  "capability_evidence",
  "career_checkin_confirmations",
  "capability_gaps",
  "career_checkins",
  "career_journal",
  "user_progress",
  "profiles",
];

export default {
  async fetch(req: Request): Promise<Response> {
    const cors = corsHeaders(req);

    // The browser sends this before the real POST because the request
    // carries an Authorization header — must be answered before the method
    // check below, mirroring ai-coach/index.ts's own handling.
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors,
      });
    }

    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: cors },
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return Response.json(
        { error: "Missing Authorization header." },
        { status: 401, headers: cors },
      );
    }

    try {
      // Scoped to the CALLER's own token only — this is how the user's
      // real, server-verified id is derived. Never trust a client-supplied
      // id anywhere in this function.
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
          { status: 401, headers: cors },
        );
      }

      const userId = user.id;

      // Service-role client — only ever used server-side, only ever for
      // this one, already server-verified user id.
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      for (const table of USER_SCOPED_TABLES) {
        const { error: deleteError } = await adminClient
          .from(table)
          .delete()
          .eq("user_id", userId);

        if (deleteError) {
          console.error(
            `delete-account: failed to clear ${table} for ${userId}:`,
            deleteError.message,
          );

          return Response.json(
            { error: "We couldn't delete all of your data. Please try again." },
            { status: 500, headers: cors },
          );
        }
      }

      const { error: deleteUserError } =
        await adminClient.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        console.error(
          `delete-account: failed to delete auth user ${userId}:`,
          deleteUserError.message,
        );

        return Response.json(
          {
            error: "We couldn't finish deleting your account. Please try again.",
          },
          { status: 500, headers: cors },
        );
      }

      return Response.json({ success: true }, { headers: cors });
    } catch (error) {
      console.error("delete-account: unexpected error:", error);

      return Response.json(
        {
          error: error instanceof Error ? error.message : "Unknown server error.",
        },
        { status: 500, headers: cors },
      );
    }
  },
};
