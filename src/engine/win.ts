import type { GameState, Player } from './types';

// ─── Win Condition Helpers ────────────────────────────────────────────────────

/**
 * Returns true if all of a player's tokens have reached the center home zone.
 */
export function hasPlayerFinished(player: Player): boolean {
  return player.tokens.every((t) => t.position.zone === 'home');
}

/**
 * Returns players who have all tokens home but do not yet have a placement assigned,
 * sorted by the index of their last finishing token in the move log.
 *
 * Used by `applyWinDetection` to assign placements in the correct order.
 */
function getNewlyFinishedPlayers(state: GameState): Player[] {
  return state.players.filter(
    (p) => hasPlayerFinished(p) && p.placement === null
  );
}

// ─── Win Detection ────────────────────────────────────────────────────────────

export interface WinDetectionResult {
  /** Updated state with placements assigned and status set if game is over */
  readonly state: GameState;
  /** IDs of players who received a new placement this call */
  readonly newlyPlacedPlayerIds: readonly string[];
  /** True when the match has reached a game-over condition */
  readonly gameOver: boolean;
}

/**
 * Evaluates win conditions after every committed move.
 *
 * Placement rules:
 *   - A player finishes when ALL their tokens reach zone 'home'.
 *   - Players are ranked by finishing order (1st, 2nd, 3rd, 4th).
 *   - In a 2-player match: when the first player finishes, the second is
 *     immediately assigned 2nd place and the game ends.
 *   - In 3-player matches: the last remaining player is assigned last place
 *     when only one unfinished player remains.
 *   - In 4-player matches: normal progression (each player gets their rank
 *     when all tokens reach home).
 *
 * This function is pure — it does not mutate the input state.
 */
export function applyWinDetection(state: GameState): WinDetectionResult {
  const newlyFinished = getNewlyFinishedPlayers(state);

  if (newlyFinished.length === 0) {
    return { state, newlyPlacedPlayerIds: [], gameOver: false };
  }

  // Assign the next available placement rank to each newly finished player
  let nextRank = state.placements.length + 1;
  const newPlacementIds: string[] = [];

  let updatedPlayers = state.players.map((player) => {
    const isNewlyFinished = newlyFinished.some((p) => p.id === player.id);
    if (!isNewlyFinished) return player;
    const rank = nextRank++;
    newPlacementIds.push(player.id);
    return { ...player, placement: rank };
  });

  const updatedPlacements = [
    ...state.placements,
    ...newPlacementIds,
  ];

  // Check game-over conditions
  const unfinishedPlayers = updatedPlayers.filter((p) => p.placement === null);

  let gameOver = false;

  if (unfinishedPlayers.length === 0) {
    // All players finished — normal game over
    gameOver = true;
  } else if (unfinishedPlayers.length === 1) {
    // Only one player left — assign last place automatically
    const lastPlayer = unfinishedPlayers[0];
    const lastRank = nextRank;
    updatedPlayers = updatedPlayers.map((p) =>
      p.id === lastPlayer.id ? { ...p, placement: lastRank } : p
    );
    updatedPlacements.push(lastPlayer.id);
    gameOver = true;
  } else if (state.metadata.playerCount === 2 && updatedPlacements.length >= 1) {
    // 2-player match: first finisher wins, second is immediately last
    const lastPlayer = unfinishedPlayers[0];
    const lastRank = 2;
    updatedPlayers = updatedPlayers.map((p) =>
      p.id === lastPlayer.id ? { ...p, placement: lastRank } : p
    );
    if (!updatedPlacements.includes(lastPlayer.id)) {
      updatedPlacements.push(lastPlayer.id);
    }
    gameOver = true;
  }

  const updatedState: GameState = {
    ...state,
    players: updatedPlayers,
    placements: updatedPlacements,
    status: gameOver ? 'game_over' : state.status,
    turn: gameOver
      ? { ...state.turn, phase: 'GAME_OVER' }
      : state.turn,
  };

  return {
    state: updatedState,
    newlyPlacedPlayerIds: newPlacementIds,
    gameOver,
  };
}

/**
 * Returns the current standings: players sorted by placement (finished first),
 * then by token progress for unfinished players (most tokens home first).
 *
 * Useful for HUD display and recap screens.
 */
export function getStandings(state: GameState): Player[] {
  return [...state.players].sort((a, b) => {
    // Placed players come first, sorted by rank
    if (a.placement !== null && b.placement !== null) {
      return a.placement - b.placement;
    }
    if (a.placement !== null) return -1;
    if (b.placement !== null) return 1;

    // Unfinished: sort by tokens home descending
    const aHome = a.tokens.filter((t) => t.position.zone === 'home').length;
    const bHome = b.tokens.filter((t) => t.position.zone === 'home').length;
    return bHome - aHome;
  });
}
