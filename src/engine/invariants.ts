import { BOARD_SQUARE_COUNT, HOME_COLUMN_LENGTH } from './constants';
import type { GameState, TokenPosition, ValidationResult } from './types';

// ─── Position Helpers ─────────────────────────────────────────────────────────

function isValidBoardSquare(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < BOARD_SQUARE_COUNT;
}

function isValidHomeColumnIndex(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < HOME_COLUMN_LENGTH;
}

export function isValidPosition(pos: TokenPosition): boolean {
  switch (pos.zone) {
    case 'start': return true;
    case 'home':  return true;
    case 'board': return isValidBoardSquare(pos.square);
    case 'home_column': return isValidHomeColumnIndex(pos.index);
    default: {
      const _exhaustive: never = pos;
      void _exhaustive;
      return false;
    }
  }
}

// ─── State Invariant Validator ────────────────────────────────────────────────

/**
 * Validates all declared invariants for a GameState.
 * Run this after every state transition during development and testing.
 *
 * Returns a ValidationResult with valid=true and an empty errors array when
 * all invariants hold. If any invariant is violated, valid=false and errors
 * lists every violation found (not just the first one).
 */
export function validateGameState(state: GameState): ValidationResult {
  const errors: string[] = [];

  // I1: player count matches metadata
  if (state.players.length !== state.metadata.playerCount) {
    errors.push(
      `I1: players.length (${state.players.length}) !== metadata.playerCount (${state.metadata.playerCount})`
    );
  }

  const playerById = new Map(state.players.map((p) => [p.id, p]));
  const tokenById = new Map(
    state.players.flatMap((p) => p.tokens.map((t) => [t.id, t]))
  );
  const allTokenIds = new Set<string>();

  for (const player of state.players) {
    // I2: each player has the correct token count
    if (player.tokens.length !== state.metadata.tokensPerPlayer) {
      errors.push(
        `I2: player "${player.id}" has ${player.tokens.length} tokens, expected ${state.metadata.tokensPerPlayer}`
      );
    }

    for (const token of player.tokens) {
      // I3a: token IDs are globally unique
      if (allTokenIds.has(token.id)) {
        errors.push(`I3: duplicate token id "${token.id}"`);
      }
      allTokenIds.add(token.id);

      // I3b: token color matches its player's color
      if (token.color !== player.color) {
        errors.push(
          `I3: token "${token.id}" color "${token.color}" does not match player color "${player.color}"`
        );
      }

      // I4 & I5: position values are within valid ranges
      if (!isValidPosition(token.position)) {
        errors.push(
          `I4/I5: token "${token.id}" has invalid position: ${JSON.stringify(token.position)}`
        );
      }
    }
  }

  // I6: no common-path square is occupied by tokens of more than one color
  // (Applies after full move resolution; captures are atomic so this holds
  //  between actions, never mid-resolution.)
  const boardOccupancy = new Map<number, string>(); // square → first color seen
  for (const player of state.players) {
    for (const token of player.tokens) {
      if (token.position.zone === 'board') {
        const sq = token.position.square;
        const existing = boardOccupancy.get(sq);
        if (existing !== undefined && existing !== player.color) {
          errors.push(
            `I6: board square ${sq} is occupied by tokens of color "${existing}" and "${player.color}" simultaneously`
          );
        }
        boardOccupancy.set(sq, player.color);
      }
    }
  }

  // I7: each prisoner token must exist and must belong to a different player than the captor
  for (const prisoner of state.prisoners) {
    const token = tokenById.get(prisoner.tokenId);
    const captor = playerById.get(prisoner.capturedByPlayerId);

    if (!token) {
      errors.push(`I7: prisoner references unknown token "${prisoner.tokenId}"`);
    }
    if (!captor) {
      errors.push(`I7: prisoner references unknown captor player "${prisoner.capturedByPlayerId}"`);
    }
    if (token && captor && token.color === captor.color) {
      errors.push(
        `I7: prisoner token "${prisoner.tokenId}" has same color as captor player "${prisoner.capturedByPlayerId}"`
      );
    }
  }

  // I8: prisoners must be empty when ransom rule is disabled
  if (!state.rules.ransom && state.prisoners.length > 0) {
    errors.push(
      `I8: prisoners array has ${state.prisoners.length} entries but rules.ransom is false`
    );
  }

  // I9: placements has no duplicates and all IDs reference known players
  const placementSet = new Set<string>();
  for (const pid of state.placements) {
    if (!playerById.has(pid)) {
      errors.push(`I9: placement references unknown player id "${pid}"`);
    }
    if (placementSet.has(pid)) {
      errors.push(`I9: duplicate placement for player id "${pid}"`);
    }
    placementSet.add(pid);
  }

  // I10: consecutiveSixes must be an integer in [0, 2]
  const sixes = state.turn.consecutiveSixes;
  if (!Number.isInteger(sixes) || sixes < 0 || sixes > 2) {
    errors.push(
      `I10: turn.consecutiveSixes (${sixes}) must be an integer in [0, 2]`
    );
  }

  // I11: activePlayerId must reference a known player
  if (!playerById.has(state.turn.activePlayerId)) {
    errors.push(
      `I11: turn.activePlayerId "${state.turn.activePlayerId}" does not reference a known player`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Asserts that a GameState passes all invariants.
 * Throws an Error listing all violations in non-production environments.
 * No-ops in production (process.env.NODE_ENV === 'production').
 */
export function assertValidState(state: GameState): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return;
  }
  const result = validateGameState(state);
  if (!result.valid) {
    throw new Error(
      `Game state invariant violation(s):\n${result.errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}
