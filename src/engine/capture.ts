import { SAFE_SQUARES } from './constants';
import type { Player, PlayerColor, Prisoner, RuleToggles, Token, TokenPosition } from './types';

// ─── Safe Square Logic ────────────────────────────────────────────────────────

/**
 * Returns true if a board square grants capture immunity under the active rules.
 *
 * In Classic mode (territoryCaptures = false), the fixed SAFE_SQUARES list
 * confers immunity. When Territory Captures is ON, ALL squares lose immunity —
 * including the fixed safe squares.
 */
export function isSquareSafe(square: number, rules: Pick<RuleToggles, 'territoryCaptures'>): boolean {
  if (rules.territoryCaptures) return false;
  return SAFE_SQUARES.includes(square);
}

// ─── Capture Resolution ───────────────────────────────────────────────────────

/**
 * Describes the result of evaluating a potential capture at a destination square.
 */
export interface CaptureResult {
  /** Whether a capture actually occurs */
  readonly captures: boolean;
  /** IDs of tokens that are captured (0, 1, or more for stacks in Extra Mode) */
  readonly capturedTokenIds: readonly string[];
  /** Whether the capturing player is entitled to a bonus roll */
  readonly bonusRollGranted: boolean;
}

const NO_CAPTURE: CaptureResult = {
  captures: false,
  capturedTokenIds: [],
  bonusRollGranted: false,
};

/**
 * Evaluates whether landing at `destination` causes a capture.
 *
 * Classic rules (stacks = false):
 *   - Capture occurs when exactly one opponent token occupies the destination square.
 *   - No capture on safe squares (unless territoryCaptures is enabled).
 *   - Friendly tokens on the square are ignored (no self-capture).
 *   - A capture grants the capturing player one bonus roll.
 *
 * Stack handling (Extra Mode, stacks = true) is layered on top:
 *   - Two or more same-color tokens on the same square form a stack.
 *   - A stack can only be captured when `captureStacks` is also true (engine-05).
 *   - This function handles the Classic single-token case; engine-05 extends it for stacks.
 *
 * @param destination     The square the active token is landing on
 * @param movingColor     The color of the player making the move
 * @param allPlayers      All players in the game (to find tokens at destination)
 * @param rules           Active rule toggles
 */
export function resolveCaptureAtSquare(
  destination: TokenPosition,
  movingColor: PlayerColor,
  allPlayers: Player[],
  rules: Pick<RuleToggles, 'territoryCaptures'>
): CaptureResult {
  // Captures only happen on the common board path
  if (destination.zone !== 'board') return NO_CAPTURE;

  const square = destination.square;

  // Check safe square immunity
  if (isSquareSafe(square, rules)) return NO_CAPTURE;

  // Find all tokens at this square belonging to opponents
  const opponentTokensAtSquare = allPlayers
    .filter((p) => p.color !== movingColor)
    .flatMap((p) => p.tokens)
    .filter((t) => t.position.zone === 'board' && (t.position as Extract<TokenPosition, { zone: 'board' }>).square === square);

  if (opponentTokensAtSquare.length === 0) return NO_CAPTURE;

  // Classic rule: single opponent token → capture
  // Stack of same color: only capturable in Extra Mode (engine-05 adds that layer)
  // For now, treat any opponent tokens here as capturable (engine-05 will guard stacks)
  return {
    captures: true,
    capturedTokenIds: opponentTokensAtSquare.map((t) => t.id),
    bonusRollGranted: true,
  };
}

// ─── Token Displacement ───────────────────────────────────────────────────────

/**
 * Applies capture displacement to a list of captured token IDs.
 *
 * Classic rules (ransom = false):
 *   - Captured tokens are returned immediately to their start zone.
 *
 * Extra Mode (ransom = true):
 *   - Captured tokens become prisoners instead of returning to start.
 *   - Prisoner lifecycle is managed by engine-05.
 *
 * Returns:
 *   - Updated tokens array with captured tokens displaced
 *   - New prisoners to add (empty when ransom = false)
 */
export function applyCaptureDisplacement(params: {
  capturedTokenIds: readonly string[];
  allPlayers: Player[];
  capturingPlayerId: string;
  turnNumber: number;
  rules: Pick<RuleToggles, 'ransom'>;
}): {
  updatedPlayers: Player[];
  newPrisoners: Prisoner[];
} {
  const { capturedTokenIds, allPlayers, capturingPlayerId, turnNumber, rules } = params;

  if (capturedTokenIds.length === 0) {
    return { updatedPlayers: allPlayers, newPrisoners: [] };
  }

  const capturedSet = new Set(capturedTokenIds);
  const newPrisoners: Prisoner[] = [];

  const updatedPlayers: Player[] = allPlayers.map((player) => {
    const updatedTokens: Token[] = player.tokens.map((token) => {
      if (!capturedSet.has(token.id)) return token;

      if (rules.ransom) {
        // Token becomes a prisoner — position stays until retrieval (engine-05 tracks this)
        // We do NOT move the token position here; engine-05 manages prisoner state.
        newPrisoners.push({
          tokenId: token.id,
          capturedByPlayerId: capturingPlayerId,
          capturedAtTurn: turnNumber,
        });
        return token; // position managed by engine-05
      }

      // Classic: return immediately to start
      return { ...token, position: { zone: 'start' } as const };
    });

    return { ...player, tokens: updatedTokens };
  });

  return { updatedPlayers, newPrisoners };
}
