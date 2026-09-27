import { supabase } from "../lib/supabase";

export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({
    email,
    password,
  });
};

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  return await supabase.auth.getUser();
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

/**
 * Phase 18 — sends Supabase's own built-in password-recovery email. Never
 * reveals whether `email` belongs to a real account (Supabase's own
 * anti-enumeration behavior: this resolves the same way either way) — the
 * caller must show one neutral "check your email" outcome regardless.
 * `redirectTo` is supplied by the caller (a deep link back into this app,
 * e.g. via expo-linking's Linking.createURL) rather than hardcoded here,
 * matching this file's existing thin-passthrough convention.
 */
export const requestPasswordReset = async (
  email: string,
  redirectTo: string,
) => {
  return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
};

/**
 * Sets a new password on the CURRENT session — only meaningful once a
 * recovery session has already been established (see app/reset-password.tsx,
 * which exchanges the emailed link's tokens for one via setSession/
 * exchangeCodeForSession before ever reaching this call).
 */
export const updatePassword = async (password: string) => {
  return await supabase.auth.updateUser({ password });
};

/**
 * Phase 18 — permanently deletes the CALLING user's own account and every
 * row they own. Invokes the `delete-account` Edge Function (see
 * supabase/functions/delete-account/index.ts), which derives the caller's
 * identity exclusively from their own session token — never from anything
 * this client could supply — and performs the actual privileged deletion
 * server-side with the service-role key, which never exists in app code.
 * supabase.functions.invoke automatically attaches the current session's
 * Authorization header, the same way every other function call in this app
 * already does (see services/openaiService.ts's askAI).
 */
export const deleteAccount = async () => {
  return await supabase.functions.invoke("delete-account", {});
};
