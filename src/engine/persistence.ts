import type { GameState } from './types';
import { validateGameState } from './invariants';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const SAVE_KEY = 'ludo_extra_saved_game';
const SAVE_VERSION = 1;

// ─── Persisted Envelope ───────────────────────────────────────────────────────

interface SaveEnvelope {
  readonly version: number;
  readonly savedAt: number;
  readonly state: GameState;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Serializes and writes the current GameState to localStorage.
 * Silently no-ops when localStorage is unavailable (SSR, private browsing quota).
 */
export function saveGame(state: GameState): void {
  try {
    const envelope: SaveEnvelope = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage unavailable — not a fatal error
  }
}

// ─── Load Result ──────────────────────────────────────────────────────────────

export type LoadResult =
  | { ok: true; state: GameState; savedAt: number }
  | { ok: false; reason: 'NOT_FOUND' | 'CORRUPT' | 'VERSION_MISMATCH' | 'INVALID_STATE' };

/**
 * Reads and deserializes a saved GameState from localStorage.
 *
 * Validates:
 *   1. A save exists under the key
 *   2. The JSON parses successfully
 *   3. The envelope version matches SAVE_VERSION
 *   4. The deserialized state passes all game invariants
 *
 * Returns a typed LoadResult — never throws.
 */
export function loadGame(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  if (raw === null) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'CORRUPT' };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, reason: 'CORRUPT' };
  }

  const envelope = parsed as Record<string, unknown>;

  if (typeof envelope.version !== 'number') {
    return { ok: false, reason: 'CORRUPT' };
  }

  if (envelope.version !== SAVE_VERSION) {
    return { ok: false, reason: 'VERSION_MISMATCH' };
  }

  if (!isPlainObject(envelope.state)) {
    return { ok: false, reason: 'CORRUPT' };
  }

  const state = envelope.state as unknown as GameState;

  // Run invariant validation — rejects structurally invalid or stale saves
  const validation = validateGameState(state);
  if (!validation.valid) {
    return { ok: false, reason: 'INVALID_STATE' };
  }

  return {
    ok: true,
    state,
    savedAt: typeof envelope.savedAt === 'number' ? envelope.savedAt : 0,
  };
}

// ─── Clear ────────────────────────────────────────────────────────────────────

/**
 * Removes the saved game from localStorage.
 * Call after a match ends or when the player explicitly abandons a game.
 */
export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage unavailable — no-op
  }
}

// ─── Has Save ─────────────────────────────────────────────────────────────────

/**
 * Returns true if a saved game key exists in localStorage, without parsing it.
 * Cheap check for the "resume game?" prompt on app launch.
 */
export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
