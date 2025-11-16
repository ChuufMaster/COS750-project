// mock_results_api.ts

// ---------------------------
// State machine definition
// ---------------------------
export const STATES = [
  "Login",
  "Microlesson1",
  "Quiz",
  "Microlesson2",
  "Uml",
  "Code",
  "Results",
] as const;

export type FMState = (typeof STATES)[number];

const RESULTS_STORAGE_KEY_PREFIX = "fm_attempt_";

function storageKeyFor(userId: string): string {
  return RESULTS_STORAGE_KEY_PREFIX + userId;
}

// ---------------------------
// 1) initAttempt(userId)
// ---------------------------
/**
 * Initialise an attempt for a given user.
 * - Creates (or overwrites) a sessionStorage entry:
 *   {
 *     state: "Microlesson1"
 *   }
 * Returns true on success, false on error/invalid userId.
 */
export function initAttempt(userId: string): boolean {
  if (!userId) {
    console.warn("initAttempt called without userId");
    return false;
  }

  try {
    const key = storageKeyFor(userId);
    const initial = {
      state: "Microlesson1" as FMState,
    };
    sessionStorage.setItem(key, JSON.stringify(initial));
    return true;
  } catch (err) {
    console.error("initAttempt: failed to write to sessionStorage", err);
    return false;
  }
}

// ---------------------------
// Helper: get current blob
// ---------------------------
function readAttemptBlob(userId: string): Record<string, unknown> | null {
  if (!userId) return null;

  const key = storageKeyFor(userId);
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.error("readAttemptBlob: invalid JSON, ignoring", err);
    return null;
  }
}

function writeAttemptBlob(
  userId: string,
  blob: Record<string, unknown>
): boolean {
  try {
    const key = storageKeyFor(userId);
    sessionStorage.setItem(key, JSON.stringify(blob));
    return true;
  } catch (err) {
    console.error("writeAttemptBlob: failed to persist", err);
    return false;
  }
}

// ---------------------------
// Helper: find next state
// ---------------------------
function nextState(current: FMState): FMState {
  const idx = STATES.indexOf(current);
  if (idx === -1) {
    // unknown state → reset to Microlesson1
    return "Microlesson1";
  }
  if (idx >= STATES.length - 1) {
    // already at last state → stay there
    return STATES[STATES.length - 1];
  }
  return STATES[idx + 1];
}

// ---------------------------
// 2) submitAndProgress(userId, results)
// ---------------------------
/**
 * - Reads the current attempt object for the user.
 * - Looks at `state` in storage to know which state we're currently in.
 * - Appends results under the *current* state key:
 *     blob[currentState] = results
 * - Advances `state` to the next state in STATES.
 * - Writes back to storage.
 *
 * Returns true on success, false on any issue.
 */
export function submitAndProgress(userId: string, results: unknown): boolean {
  if (!userId) {
    console.warn("submitAndProgress called without userId");
    return false;
  }

  const blob = readAttemptBlob(userId);
  if (!blob) {
    console.warn(
      "submitAndProgress: no attempt found; call initAttempt first."
    );
    return false;
  }

  // Figure out current state
  const rawState = blob.state;
  let currentState: FMState = "Microlesson1";

  if (typeof rawState === "string" && STATES.includes(rawState as FMState)) {
    currentState = rawState as FMState;
  }

  // Attach results under the *current* state's name
  blob[currentState] = results;

  // Move to next state
  const newState = nextState(currentState);
  blob.state = newState;

  return writeAttemptBlob(userId, blob);
}

// ---------------------------
// 3) getCurrentState(userId)
// ---------------------------
/**
 * Returns the current state from storage, or null if
 * no attempt exists yet.
 */
export function getCurrentState(userId: string): FMState | null {
  if (!userId) {
    console.warn("getCurrentState called without userId");
    return null;
  }

  const blob = readAttemptBlob(userId);
  if (!blob) return null;

  const rawState = blob.state;
  if (typeof rawState === "string" && STATES.includes(rawState as FMState)) {
    return rawState as FMState;
  }

  // Fallback: treat as not started properly
  return null;
}

// ---------------------------
// 4) getProgressAndResults(userId)
// ---------------------------
/**
 * Returns the full attempt blob from storage:
 *   {
 *     state: "Quiz",
 *     Microlesson1: {...},
 *     Quiz: {...},
 *     ...
 *   }
 * or null if no attempt exists.
 */
export function getProgressAndResults(
  userId: string
): Record<string, unknown> | null {
  if (!userId) {
    console.warn("getProgressAndResults called without userId");
    return null;
  }

  return readAttemptBlob(userId);
}
