import type { PlayerColor } from './types';

/** Number of squares on the common board path (0-indexed, 0–51) */
export const BOARD_SQUARE_COUNT = 52;

/** Number of squares in each player's home column approach (0-indexed, 0–4) */
export const HOME_COLUMN_LENGTH = 5;

/** Maximum consecutive 6s before the third is canceled per rules */
export const MAX_CONSECUTIVE_SIXES = 3;

/**
 * Board square where each player's token enters from start (also their safe square).
 * Shared with board-01 which maps these to render coordinates.
 *
 * Layout (clockwise, 0-indexed):
 *   Red   → 0   | Yellow → 13
 *   Green → 26  | Blue   → 39
 */
export const STARTING_SQUARE: Record<PlayerColor, number> = {
  red: 0,
  yellow: 13,
  green: 26,
  blue: 39,
} as const;

/**
 * Board square from which a player's token enters its home column on the next step.
 * After a token lands on (or passes) this square having completed a full loop,
 * it transitions to zone 'home_column' at index 0.
 */
export const HOME_ENTRY_SQUARE: Record<PlayerColor, number> = {
  red: 51,
  yellow: 12,
  green: 25,
  blue: 38,
} as const;

/**
 * Fixed safe squares on the common path where, by default (Classic rules),
 * tokens cannot be captured. When Territory Captures is ON, immunity is removed.
 */
export const SAFE_SQUARES: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47] as const; // sq 0/13/26/39 = starting squares; sq 8/21/34/47 = mid-arm safe squares
