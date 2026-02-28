import type { Player, PlayerColor, RuleToggles, Token } from './types';

// ─── Double-Block ─────────────────────────────────────────────────────────────

/**
 * Returns true if `square` is blocked to `movingColor` by the double-block rule.
 *
 * Double-block: two same-color tokens on the same square form an impenetrable
 * block. Opponents CANNOT land on or pass through that square.
 * (Passing-through is not a standard Ludo mechanic — tokens land exactly, so
 * this check applies to exact landing only.)
 *
 * Friendly tokens on the square (same color as moving player) do NOT block —
 * you can always stack your own tokens when doubleBlock is enabled.
 */
export function isSquareBlockedByDoubleBlock(
  square: number,
  movingColor: PlayerColor,
  allPlayers: Player[],
  rules: Pick<RuleToggles, 'doubleBlock'>
): boolean {
  if (!rules.doubleBlock) return false;

  for (const player of allPlayers) {
    if (player.color === movingColor) continue; // friendly — not a block to us

    const tokensAtSquare = player.tokens.filter(
      (t) => t.position.zone === 'board' && (t.position as Extract<(typeof t)['position'], { zone: 'board' }>).square === square
    );

    if (tokensAtSquare.length >= 2) return true;
  }

  return false;
}

// ─── Three-6s Penalty ─────────────────────────────────────────────────────────

/**
 * Applies the three-6s-penalty: when the third consecutive 6 is rolled,
 * the active player's LAST MOVED token is sent back to start.
 *
 * This differs from the base cancellation (which just skips the turn without
 * moving). When `threeSesPenalty` is true, the cancellation also penalizes.
 *
 * @param activePlayer   The player who rolled the third 6
 * @param lastMoveLogTokenId  The tokenId from the most recent MoveLogEntry, or null
 * @returns Updated players array with the penalized token returned to start
 */
export function applyThreeSixesPenalty(
  activePlayer: Player,
  lastMoveLogTokenId: string | null,
  allPlayers: Player[]
): Player[] {
  if (!lastMoveLogTokenId) return allPlayers;

  return allPlayers.map((player) => {
    if (player.id !== activePlayer.id) return player;

    return {
      ...player,
      tokens: player.tokens.map((token): Token => {
        if (token.id !== lastMoveLogTokenId) return token;
        // Return to start
        return { ...token, position: { zone: 'start' } as const };
      }),
    };
  });
}

// ─── Selectable Token Filter — Double-Block ───────────────────────────────────

/**
 * Filters out token IDs whose destination is blocked by the double-block rule.
 *
 * Called after `getSelectableTokenIds` to layer double-block on top of
 * standard movement legality checks.
 *
 * @param selectableTokenIds  Base selectable IDs from movement module
 * @param activePlayer        The active player
 * @param destinationMap      Map from tokenId → computed destination square (board zone only)
 * @param allPlayers          All players (to check for opponent double-blocks)
 * @param rules               Active rule toggles
 */
export function filterDoubleBlockedTokens(params: {
  selectableTokenIds: readonly string[];
  activePlayer: Player;
  destinationMap: ReadonlyMap<string, number>; // tokenId → board square (already computed)
  allPlayers: Player[];
  rules: Pick<RuleToggles, 'doubleBlock'>;
}): string[] {
  const { selectableTokenIds, activePlayer, destinationMap, allPlayers, rules } = params;

  if (!rules.doubleBlock) return [...selectableTokenIds];

  return selectableTokenIds.filter((tokenId) => {
    const destSquare = destinationMap.get(tokenId);
    if (destSquare === undefined) return true; // non-board destination, not blocked

    return !isSquareBlockedByDoubleBlock(destSquare, activePlayer.color, allPlayers, rules);
  });
}
