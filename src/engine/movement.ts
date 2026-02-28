import {
  BOARD_SQUARE_COUNT,
  HOME_COLUMN_LENGTH,
  HOME_ENTRY_SQUARE,
  STARTING_SQUARE,
} from './constants';
import type { DiceValue, PlayerColor, Token, TokenPosition } from './types';

// ─── Path Helpers ─────────────────────────────────────────────────────────────

/**
 * Advances a position on the 52-square common board path by `steps` squares,
 * wrapping around modulo BOARD_SQUARE_COUNT.
 */
function advanceBoardSquare(square: number, steps: number): number {
  return (square + steps) % BOARD_SQUARE_COUNT;
}

/**
 * Returns how many clockwise steps remain from `from` until the token reaches
 * (or passes) its home-entry boundary square.
 *
 * A token that is exactly ON its home-entry square has 0 steps remaining and
 * will enter home_column on any roll ≥ 1 (handled by computeDestination).
 *
 * The formula works because Ludo paths are cyclic:
 *   - If `from` is already past the entry square in the clockwise direction,
 *     the token will loop around and reach it next cycle.
 */
function stepsToHomeEntry(from: number, color: PlayerColor): number {
  const entry = HOME_ENTRY_SQUARE[color];
  if (from <= entry) return entry - from;
  return BOARD_SQUARE_COUNT - from + entry;
}

// ─── Destination Calculator ───────────────────────────────────────────────────

/**
 * Computes the resulting TokenPosition after moving `roll` steps from `current`.
 *
 * Handles all zone transitions:
 *   start → board            (only when roll = 6; caller enforces this)
 *   board → board            (most moves)
 *   board → home_column      (when passing home-entry boundary)
 *   home_column → home_column
 *   home_column → home       (exact landing at index HOME_COLUMN_LENGTH - 1)
 *   home_column → home_column (overshoot 'stay': token does not move)
 *
 * @param current       Current token position
 * @param roll          Dice value (1–6)
 * @param color         Token's player color (needed for home-column routing)
 * @param overshoot     'stay' | 'bounce' — what happens when roll overshoots center home
 * @returns             New TokenPosition, or null if the move is not possible
 *                      (e.g. token is already home, or start token with roll ≠ 6)
 */
export function computeDestination(
  current: TokenPosition,
  roll: DiceValue,
  color: PlayerColor,
  overshoot: 'stay' | 'bounce'
): TokenPosition | null {
  switch (current.zone) {
    case 'home':
      // Already finished — no further movement
      return null;

    case 'start': {
      // Can only enter the board on a roll of 6
      if (roll !== 6) return null;
      return { zone: 'board', square: STARTING_SQUARE[color] };
    }

    case 'board': {
      const stepsLeft = stepsToHomeEntry(current.square, color);

      if (roll <= stepsLeft) {
        // Token stays on the common path
        return { zone: 'board', square: advanceBoardSquare(current.square, roll) };
      }

      // Token has enough movement to enter its home column
      const stepsIntoHomeColumn = roll - stepsLeft - 1;
      return resolveHomeColumnLanding(stepsIntoHomeColumn, overshoot);
    }

    case 'home_column': {
      const stepsIntoHomeColumn = current.index + roll;
      return resolveHomeColumnLanding(stepsIntoHomeColumn, overshoot);
    }

    default: {
      const _exhaustive: never = current;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * Resolves the final position within (or at the end of) the home column.
 *
 * `index` is the 0-based target index after applying the roll.
 * The last valid index is HOME_COLUMN_LENGTH - 1 (index 4 for a 5-square column).
 * Landing exactly there means the token reaches home (center).
 *
 * Overshoot behavior:
 *   'stay'   — token does not move if roll exceeds remaining home column squares (return null)
 *   'bounce' — token bounces backward from the center by the excess steps
 */
function resolveHomeColumnLanding(
  index: number,
  overshoot: 'stay' | 'bounce'
): TokenPosition | null {
  const lastIndex = HOME_COLUMN_LENGTH - 1;

  if (index === lastIndex) {
    return { zone: 'home' };
  }

  if (index < lastIndex) {
    return { zone: 'home_column', index };
  }

  // Overshoot: index > lastIndex
  if (overshoot === 'stay') {
    // Token does not move — return null to signal no valid landing
    // Caller (move generator) treats null as "move not available"
    return null;
  }

  // overshoot === 'bounce': bounce backward from center
  const excess = index - lastIndex;
  const bounced = lastIndex - excess;
  // If bounce goes below 0, it exits back onto the board — not implemented in Classic rules.
  // Per spec, home column exit only available in Extra Mode. Clamp to 0.
  return { zone: 'home_column', index: Math.max(0, bounced) };
}

// ─── Move Legality ────────────────────────────────────────────────────────────

/**
 * Returns true if `token` can legally be moved with `roll` under Classic rules.
 *
 * Classic move legality:
 *   - Token in 'home': never moveable
 *   - Token in 'start': only moveable on roll of 6
 *   - Token on 'board' or 'home_column': always moveable (destination may be
 *     null for overshoot='stay', handled by move generator)
 */
export function isTokenMoveable(token: Token, roll: DiceValue): boolean {
  switch (token.position.zone) {
    case 'home':  return false;
    case 'start': return roll === 6;
    case 'board': return true;
    case 'home_column': return true;
    default: {
      const _exhaustive: never = token.position;
      void _exhaustive;
      return false;
    }
  }
}

// ─── Valid Move Generator ─────────────────────────────────────────────────────

/**
 * Returns the subset of `tokens` that have a valid (non-null) destination
 * for the given roll under Classic rules.
 *
 * A token is excluded if:
 *   - It is in 'home' (finished)
 *   - It is in 'start' and roll ≠ 6
 *   - Its destination resolves to the same position it already occupies
 *     (can happen with overshoot='stay')
 */
export function getSelectableTokenIds(
  tokens: Token[],
  roll: DiceValue,
  overshoot: 'stay' | 'bounce'
): string[] {
  return tokens
    .filter((token) => {
      if (!isTokenMoveable(token, roll)) return false;
      const dest = computeDestination(token.position, roll, token.color, overshoot);
      if (dest === null) return false;
      // Overshoot-stay produces the same position — token cannot move
      return !isSamePosition(token.position, dest);
    })
    .map((t) => t.id);
}

// ─── Position Equality ────────────────────────────────────────────────────────

/** Deep equality check for two TokenPositions. */
export function isSamePosition(a: TokenPosition, b: TokenPosition): boolean {
  if (a.zone !== b.zone) return false;
  if (a.zone === 'board' && b.zone === 'board') return a.square === b.square;
  if (a.zone === 'home_column' && b.zone === 'home_column') return a.index === b.index;
  return true; // 'start' and 'home' have no sub-fields
}
