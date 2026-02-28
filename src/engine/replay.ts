import { applyAction } from './reducer';
import { createRng } from './dice';
import type { GameAction } from './reducer';
import type { GameState, MatchMetadata, MoveLogEntry, PlayerColor, RuleToggles } from './types';

// ─── Replay Format ────────────────────────────────────────────────────────────

/** Current schema version — increment when the format changes incompatibly. */
const REPLAY_VERSION = 1;

/**
 * A serialized replay: the complete record needed to reconstruct a match
 * deterministically from first action to final state.
 *
 * Storage: seed + action list. The full state is not stored — it is derived
 * by replaying actions from `createInitialState`.
 */
export interface ReplayRecord {
  readonly version: number;
  readonly metadata: MatchMetadata;
  readonly rules: RuleToggles;
  readonly playerSetups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly color: PlayerColor;
    readonly isAI: boolean;
    readonly aiDifficulty: 'easy' | 'medium' | 'hard' | null;
  }>;
  /** Serialized actions in the order they were committed. */
  readonly actions: readonly SerializedAction[];
  /** Snapshot of the final state's move log for quick access without full replay. */
  readonly moveLog: readonly MoveLogEntry[];
  /** Final placements array from the game-over state. */
  readonly finalPlacements: readonly string[];
  /** Unix timestamp ms when the replay was exported. */
  readonly exportedAt: number;
}

// ─── Serialized Action ────────────────────────────────────────────────────────

/**
 * A GameAction serialized to a plain object (no functions, no class instances).
 *
 * ROLL_DICE is stored as its RNG seed snapshot so it can be reconstructed
 * without needing the live Rng instance.
 */
export type SerializedAction =
  | { type: 'ROLL_DICE'; rngSeed: number }
  | { type: 'SELECT_TOKEN'; tokenId: string }
  | { type: 'COMMIT_MOVE' }
  | { type: 'COMMIT_RANSOM_RETRIEVAL'; tokenId: string };

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Exports a finished (or in-progress) game to a ReplayRecord.
 * Requires the ordered list of SerializedActions accumulated during play.
 */
export function exportReplay(
  state: GameState,
  actions: readonly SerializedAction[]
): ReplayRecord {
  return {
    version: REPLAY_VERSION,
    metadata: state.metadata,
    rules: state.rules,
    playerSetups: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isAI: p.isAI,
      aiDifficulty: p.aiDifficulty,
    })),
    actions,
    moveLog: state.moveLog,
    finalPlacements: state.placements,
    exportedAt: Date.now(),
  };
}

/**
 * Serializes a ReplayRecord to a JSON string.
 * Safe to store in localStorage or transmit over the wire.
 */
export function serializeReplay(record: ReplayRecord): string {
  return JSON.stringify(record);
}

// ─── Deserialization ──────────────────────────────────────────────────────────

export type DeserializeResult =
  | { ok: true; record: ReplayRecord }
  | { ok: false; error: 'INVALID_JSON' | 'SCHEMA_MISMATCH' | 'UNSUPPORTED_VERSION'; message: string };

/**
 * Parses a JSON string back into a ReplayRecord and validates its structure.
 * Returns an error result for malformed or version-incompatible data.
 */
export function deserializeReplay(json: string): DeserializeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'INVALID_JSON', message: 'Could not parse replay JSON.' };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'SCHEMA_MISMATCH', message: 'Replay is not a plain object.' };
  }

  const version = (parsed as Record<string, unknown>).version;
  if (typeof version !== 'number') {
    return { ok: false, error: 'SCHEMA_MISMATCH', message: 'Missing version field.' };
  }
  if (version !== REPLAY_VERSION) {
    return {
      ok: false,
      error: 'UNSUPPORTED_VERSION',
      message: `Replay version ${version} is not supported (expected ${REPLAY_VERSION}).`,
    };
  }

  const record = parsed as unknown as ReplayRecord;

  if (
    !record.metadata ||
    !record.rules ||
    !Array.isArray(record.playerSetups) ||
    !Array.isArray(record.actions) ||
    !Array.isArray(record.moveLog) ||
    !Array.isArray(record.finalPlacements)
  ) {
    return { ok: false, error: 'SCHEMA_MISMATCH', message: 'Replay is missing required fields.' };
  }

  return { ok: true, record };
}

// ─── Replay Reconstruction ────────────────────────────────────────────────────

export type ReconstructResult =
  | { ok: true; state: GameState; actionCount: number }
  | { ok: false; error: 'INVALID_ACTION'; message: string; actionIndex: number };

/**
 * Reconstructs a GameState by replaying all actions from a ReplayRecord.
 *
 * Uses the replay's seed to create a fresh RNG per ROLL_DICE action, ensuring
 * deterministic output regardless of when or where reconstruction runs.
 *
 * @param record        The deserialized ReplayRecord
 * @param initialState  The GameState created from `createInitialState` with matching params
 * @param upToIndex     Optional — stop after this many actions (for step-by-step replay)
 */
export function reconstructFromReplay(
  record: ReplayRecord,
  initialState: GameState,
  upToIndex?: number
): ReconstructResult {
  const limit = upToIndex !== undefined
    ? Math.min(upToIndex, record.actions.length)
    : record.actions.length;

  let state = initialState;

  for (let i = 0; i < limit; i++) {
    const serialized = record.actions[i];
    const action = hydrateAction(serialized);
    const result = applyAction(state, action);

    if (!result.ok) {
      return {
        ok: false,
        error: 'INVALID_ACTION',
        message: `Action ${i} (${serialized.type}) rejected: ${result.message}`,
        actionIndex: i,
      };
    }

    state = result.state;
  }

  return { ok: true, state, actionCount: limit };
}

// ─── Action Hydration ─────────────────────────────────────────────────────────

/**
 * Converts a SerializedAction back into a live GameAction.
 * ROLL_DICE actions are re-seeded from the stored rngSeed snapshot.
 */
function hydrateAction(serialized: SerializedAction): GameAction {
  switch (serialized.type) {
    case 'ROLL_DICE':
      return { type: 'ROLL_DICE', rng: createRng(serialized.rngSeed) };
    case 'SELECT_TOKEN':
      return { type: 'SELECT_TOKEN', tokenId: serialized.tokenId };
    case 'COMMIT_MOVE':
      return { type: 'COMMIT_MOVE' };
    case 'COMMIT_RANSOM_RETRIEVAL':
      return { type: 'COMMIT_RANSOM_RETRIEVAL', tokenId: serialized.tokenId };
    default: {
      const _exhaustive: never = serialized;
      void _exhaustive;
      throw new Error('Unknown serialized action type.');
    }
  }
}

// ─── Action Recorder Helper ───────────────────────────────────────────────────

/**
 * Records a SerializedAction from a live GameAction.
 * Call this alongside `applyAction` to build up the replay's action list.
 *
 * For ROLL_DICE, captures the RNG state BEFORE the roll (matching DiceRoll.rngSnapshot).
 */
export function recordAction(action: GameAction): SerializedAction {
  switch (action.type) {
    case 'ROLL_DICE':
      return { type: 'ROLL_DICE', rngSeed: action.rng.state() };
    case 'SELECT_TOKEN':
      return { type: 'SELECT_TOKEN', tokenId: action.tokenId };
    case 'COMMIT_MOVE':
      return { type: 'COMMIT_MOVE' };
    case 'COMMIT_RANSOM_RETRIEVAL':
      return { type: 'COMMIT_RANSOM_RETRIEVAL', tokenId: action.tokenId };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      throw new Error('Unknown action type.');
    }
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
