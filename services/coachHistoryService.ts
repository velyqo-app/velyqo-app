import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local-only persistence for Coach's on-screen conversation, so it survives
 * a full app restart. Mirrors hooks/useRoadmap.ts's own AsyncStorage
 * caching pattern exactly (versioned, userId-scoped key; readJson/writeJson-
 * style helpers that never let a storage problem surface as an error the
 * user sees) rather than inventing a second convention.
 *
 * This is restore-the-current-conversation convenience, not a permanent
 * chat archive and not a second source of truth: Coach's own AI calls
 * (services/openaiService.ts -> buildCoachPrompt) never read from here and
 * never send prior turns to the model — each question is still answered
 * from AIContext/Career Standing alone, exactly as before this file
 * existed. Nothing here changes that.
 */

/**
 * Bump when the stored message shape changes, so an entry written by an
 * older version is discarded rather than misread — same convention as
 * hooks/useRoadmap.ts's own CACHE_VERSION.
 */
const CACHE_VERSION = "v1";

const COACH_HISTORY_PREFIX = "velyqo:coach-history";

/**
 * Keep only the most recent messages — this restores the CURRENT
 * conversation across a restart, not an ever-growing archive. 50 messages
 * (25 exchanges) comfortably covers a normal Coach session while keeping
 * the stored value small.
 */
const MAX_STORED_MESSAGES = 50;

export interface StoredCoachMessage {
  text: string;
  isUser: boolean;

  /** Matches app/(app)/ai-coach.tsx's own Message shape exactly — kept as
   * a structurally-compatible sibling type here rather than importing from
   * a screen file. */
  failed?: boolean;
}

function coachHistoryKey(userId: string): string {
  return `${COACH_HISTORY_PREFIX}:${CACHE_VERSION}:${userId}`;
}

/** Never trusts a stored value's shape blindly — a corrupt entry, or one
 * written by a future/different version of this feature, is treated
 * exactly like no entry at all (see loadCoachHistory). */
function isStoredCoachMessage(value: unknown): value is StoredCoachMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.text === "string" &&
    typeof candidate.isUser === "boolean" &&
    (candidate.failed === undefined || typeof candidate.failed === "boolean")
  );
}

/**
 * Restores the Coach conversation saved for this user, oldest-first,
 * exactly as it was stored. Returns an empty array — never throws, never
 * surfaces an error — for a first-ever use, a missing entry, a corrupt or
 * old-shaped entry, or any storage read failure; every one of those is an
 * honest "nothing to restore", matching hooks/useRoadmap.ts's own
 * readJson convention of never letting a cache problem reach the user.
 */
export async function loadCoachHistory(
  userId: string,
): Promise<StoredCoachMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(coachHistoryKey(userId));

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isStoredCoachMessage) : [];
  } catch {
    return [];
  }
}

/**
 * Persists the current on-screen Coach conversation for this user,
 * oldest-first, capped to the most recent MAX_STORED_MESSAGES entries. A
 * write failure is swallowed — never surfaced to the user, never breaks
 * Coach — this is convenience persistence, not a source of truth for
 * anything else in the app.
 */
export async function saveCoachHistory(
  userId: string,
  messages: StoredCoachMessage[],
): Promise<void> {
  try {
    const capped = messages.slice(-MAX_STORED_MESSAGES);

    await AsyncStorage.setItem(
      coachHistoryKey(userId),
      JSON.stringify(capped),
    );
  } catch {
    // A cache write failure must never break Coach.
  }
}

/**
 * Explicitly clears this user's stored Coach conversation. Per-user key
 * scoping (coachHistoryKey) already prevents a different account signed
 * in on the same device from ever reading it — the same guarantee
 * hooks/useRoadmap.ts's own cache already relies on without clearing on
 * sign-out — but Coach conversations can carry more candid content than a
 * cached roadmap, so this removes it outright on sign-out rather than
 * merely leaving it unreachable. Non-fatal on failure: worst case a stale
 * entry lingers under the old key, which per-user scoping still keeps
 * isolated from whoever signs in next.
 */
export async function clearCoachHistory(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(coachHistoryKey(userId));
  } catch {
    // Non-fatal — see doc comment above.
  }
}
