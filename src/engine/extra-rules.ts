import { HOME_COLUMN_LENGTH, STARTING_SQUARE } from './constants';
import type {
  DiceValue,
  Player,
  PlayerColor,
  Prisoner,
  RuleToggles,
  Token,
  TokenPosition,
} from './types';

// ─── Stack Detection ──────────────────────────────────────────────────────────

/**
 * Returns all stacks (groups of 2+ same-color tokens) on the common board path.
 *
 * A stack: 2 or more tokens of the same color occupying the same board square.
 * Stacks can only exist on the board zone — not in home_column or start.
 */
export interface Stack {
  readonly color: PlayerColor;
  readonly square: number;
  readonly tokenIds: readonly string[];
}

export function findStacks(players: Player[]): Stack[] {
  // Map from "color:square" → token IDs
  const groups = new Map<string, { color: PlayerColor; square: number; ids: string[] }>();

  for (const player of players) {
    for (const token of player.tokens) {
      if (token.position.zone !== 'board') continue;
      const key = `${player.color}:${token.position.square}`;
      const existing = groups.get(key);
      if (existing) {
        existing.ids.push(token.id);
      } else {
        groups.set(key, { color: player.color, square: token.position.square, ids: [token.id] });
      }
    }
  }

  return Array.from(groups.values())
    .filter((g) => g.ids.length >= 2)
    .map((g) => ({ color: g.color, square: g.square, tokenIds: g.ids }));
}

/**
 * Returns the stack at `square` if one exists, otherwise null.
 */
export function getStackAtSquare(players: Player[], square: number): Stack | null {
  const stacks = findStacks(players);
  return stacks.find((s) => s.square === square) ?? null;
}

// ─── Stack Capture Guard ──────────────────────────────────────────────────────

/**
 * Determines whether a landing on `square` by a single token (not a stack)
 * can capture the occupants under Extra Mode rules.
 *
 * Extra Mode stack rule: a stack (2+ same-color tokens) can only be captured
 * by another stack of equal or greater size landing on the same square.
 * A single token CANNOT capture a stack — it is blocked.
 *
 * @param landingTokenIds  The IDs of the token(s) landing on the square (1 = single, 2+ = stack move)
 * @param targetSquare     The destination square
 * @param movingColor      Color of the moving player
 * @param allPlayers       All players (to find existing tokens at target)
 * @returns true if capture is permitted, false if blocked by stack immunity
 */
export function canCaptureAtSquare(
  landingTokenIds: readonly string[],
  targetSquare: number,
  movingColor: PlayerColor,
  allPlayers: Player[]
): boolean {
  const stack = getStackAtSquare(allPlayers, targetSquare);
  if (!stack) return true; // no stack — single opponent token, always capturable

  // Stack present at target square
  if (stack.color === movingColor) return false; // friendly stack, no capture

  // Opponent stack: can only be captured if landing group is same size or larger
  return landingTokenIds.length >= stack.tokenIds.length;
}

// ─── Territory Captures (Home Column) ────────────────────────────────────────

/**
 * Determines whether landing at a home_column position triggers a capture
 * under Extra Mode territory capture rules.
 *
 * When Territory Captures is enabled, captures can happen inside home columns.
 * This only applies to the OPPONENT's home column (a player cannot enter their
 * own home column from outside — movement rules prevent that).
 *
 * Returns the IDs of opponent tokens displaced, or an empty array.
 */
export function resolveTerritoryCapture(
  destination: TokenPosition,
  movingColor: PlayerColor,
  allPlayers: Player[],
  rules: Pick<RuleToggles, 'territoryCaptures'>
): readonly string[] {
  if (!rules.territoryCaptures) return [];
  if (destination.zone !== 'home_column') return [];

  const index = destination.index;

  // Find opponent tokens at this home_column index
  // (a player can only enter their own home column in Classic — but in Extra Mode
  //  territory captures allow capturing tokens inside opponent home columns)
  const capturedIds: string[] = [];
  for (const player of allPlayers) {
    if (player.color === movingColor) continue;
    for (const token of player.tokens) {
      if (token.position.zone === 'home_column' && token.position.index === index) {
        capturedIds.push(token.id);
      }
    }
  }

  return capturedIds;
}

// ─── Ransom / Prisoner Lifecycle ──────────────────────────────────────────────

/**
 * Returns all prisoners belonging to opponents of `activeColor` that are
 * eligible for ransom retrieval by the active player on a roll of 6.
 *
 * Eligibility rule: the active player can retrieve ONE of their own captured tokens.
 * (Tokens that belong to the active player and are currently prisoners.)
 */
export function getRetrievablePrisoners(
  activePlayerId: string,
  activeColor: PlayerColor,
  prisoners: Prisoner[],
  allPlayers: Player[]
): Prisoner[] {
  // Find tokens belonging to the active player that are in prison
  const activePlayerTokenIds = new Set(
    allPlayers
      .find((p) => p.id === activePlayerId)
      ?.tokens.map((t) => t.id) ?? []
  );

  return prisoners.filter((p) => activePlayerTokenIds.has(p.tokenId));
}

/**
 * Applies ransom retrieval: removes the prisoner from the prisoners list and
 * returns the token to its start zone.
 *
 * Returns updated players and updated prisoners arrays.
 */
export function applyRansomRetrieval(params: {
  tokenId: string;
  allPlayers: Player[];
  prisoners: Prisoner[];
}): { updatedPlayers: Player[]; updatedPrisoners: Prisoner[] } {
  const { tokenId, allPlayers, prisoners } = params;

  const updatedPrisoners = prisoners.filter((p) => p.tokenId !== tokenId);

  const updatedPlayers: Player[] = allPlayers.map((player) => ({
    ...player,
    tokens: player.tokens.map((token): Token => {
      if (token.id !== tokenId) return token;
      // Return prisoner to start
      return { ...token, position: { zone: 'start' } as const };
    }),
  }));

  return { updatedPlayers, updatedPrisoners };
}

// ─── Home Column Exit ─────────────────────────────────────────────────────────

/**
 * Computes the destination when a token in its home column exits back onto
 * the common board path on a roll of 6 (Extra Mode: homeColumnExit = true).
 *
 * A token at any home_column index (0–4) exits to the color's STARTING_SQUARE
 * on the common path. The home column index does not affect the exit square.
 *
 * Returns null if homeColumnExit is disabled or the token is not in home_column.
 */
export function computeHomeColumnExit(
  token: Token,
  roll: DiceValue,
  rules: Pick<RuleToggles, 'homeColumnExit'>
): TokenPosition | null {
  if (!rules.homeColumnExit) return null;
  if (roll !== 6) return null;
  if (token.position.zone !== 'home_column') return null;

  return { zone: 'board', square: STARTING_SQUARE[token.color] };
}

// ─── Home Column Territory Capture Resolution ─────────────────────────────────

/**
 * Applies territory capture displacement for tokens captured inside a home column.
 * Captured tokens return to their start zone (ransom does not apply inside home columns).
 *
 * Returns updated players array.
 */
export function applyHomeColumnCaptureDisplacement(
  capturedTokenIds: readonly string[],
  allPlayers: Player[]
): Player[] {
  if (capturedTokenIds.length === 0) return allPlayers;

  const capturedSet = new Set(capturedTokenIds);

  return allPlayers.map((player) => ({
    ...player,
    tokens: player.tokens.map((token): Token => {
      if (!capturedSet.has(token.id)) return token;
      return { ...token, position: { zone: 'start' } as const };
    }),
  }));
}

// ─── Selectable Token Augmentation (Extra Mode) ───────────────────────────────

/**
 * Given a base set of selectable token IDs (from movement.getSelectableTokenIds),
 * augments or filters them based on Extra Mode rules:
 *
 *   1. Ransom retrieval option: if the active player has prisoners and rolls 6,
 *      add a sentinel "RANSOM_RETRIEVAL" indicator to the selectable set.
 *      (Actual prisoner selection is handled by the UI/reducer, not here.)
 *
 *   2. Home column exit: if homeColumnExit is enabled and roll = 6, tokens in
 *      home_column become selectable for exit (if not already included).
 *
 * Returns augmented list of token IDs and a flag for ransom retrieval availability.
 */
export function augmentSelectableTokensForExtraMode(params: {
  baseSelectableTokenIds: readonly string[];
  activePlayer: Player;
  roll: DiceValue;
  prisoners: Prisoner[];
  rules: RuleToggles;
}): {
  selectableTokenIds: string[];
  ransomRetrievalAvailable: boolean;
} {
  const { baseSelectableTokenIds, activePlayer, roll, prisoners, rules } = params;

  const selectable = new Set(baseSelectableTokenIds);

  // Home column exit: tokens in home_column become selectable on roll=6
  if (rules.homeColumnExit && roll === 6) {
    for (const token of activePlayer.tokens) {
      if (token.position.zone === 'home_column') {
        selectable.add(token.id);
      }
    }
  }

  // Ransom retrieval: if active player has prisoners, rolling 6 allows retrieval
  const activeTokenIds = new Set(activePlayer.tokens.map((t) => t.id));
  const hasPrisoners = prisoners.some((p) => activeTokenIds.has(p.tokenId));
  const ransomRetrievalAvailable = rules.ransom && roll === 6 && hasPrisoners;

  return {
    selectableTokenIds: Array.from(selectable),
    ransomRetrievalAvailable,
  };
}

// ─── Home Column Length Check ─────────────────────────────────────────────────

/**
 * Returns whether `index` is the final square of the home column (center home entry).
 */
export function isFinalHomeColumnIndex(index: number): boolean {
  return index === HOME_COLUMN_LENGTH - 1;
}
