import { setup, assign } from 'xstate';
import { applyAction } from '../engine/reducer';
import { createRng } from '../engine/dice';
import type { GameState } from '../engine/types';
import type { Rng } from '../engine/dice';

// ─── Machine Context ───────────────────────────────────────────────────────────

export interface GameMachineContext {
  gameState: GameState;
  rng: Rng;
  error: string | null;
}

// ─── Machine Events ────────────────────────────────────────────────────────────

export type GameMachineEvent =
  | { type: 'ROLL_DICE' }
  | { type: 'PRE_SELECT_TOKEN'; tokenId: string }
  | { type: 'SELECT_TOKEN'; tokenId: string }
  | { type: 'DESELECT_TOKEN' }
  | { type: 'COMMIT_MOVE' }
  | { type: 'RESET_GAME' }
  | { type: 'RANSOM_RETRIEVAL'; tokenId: string }
  | { type: 'CLEAR_ERROR' };

// ─── Auto-play Decision ────────────────────────────────────────────────────────

/**
 * Determines whether the current post-roll state should be auto-committed
 * without user interaction.
 *
 * Auto-commit criteria (all must be true):
 *   1. Reducer already auto-selected a token (phase === AWAITING_COMMIT,
 *      exactly 1 valid token).
 *   2. There is no ambiguity — the player has no meaningful alternative.
 *      Ambiguity exists when dice === 6 AND there are tokens still in start
 *      that could be brought out AND there is also a token already on the board
 *      that could move. The reducer would present multiple valid tokens in that
 *      case (phase === AWAITING_MOVE), so we never reach here. But we guard
 *      explicitly for safety.
 *
 * Cases that ARE auto-committed:
 *   - Non-6 roll, single token on board → move it automatically.
 *   - Roll of 6, all tokens in start → start the first one automatically
 *     (no other option).
 *   - Roll of 6, single selectable token (all others finished/blocked) → move it.
 */
function shouldAutoCommit(ctx: GameMachineContext): boolean {
  const { turn } = ctx.gameState;
  return (
    turn.phase === 'AWAITING_COMMIT' &&
    turn.selectedTokenId !== null &&
    turn.validMoveTokenIds.length === 1
  );
}

// ─── Shared commit logic ───────────────────────────────────────────────────────

function commitMove(ctx: GameMachineContext): GameState {
  const result = applyAction(ctx.gameState, { type: 'COMMIT_MOVE' });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.state;
}

function canCommitMove(ctx: GameMachineContext): boolean {
  const result = applyAction(ctx.gameState, { type: 'COMMIT_MOVE' });
  return result.ok;
}

// ─── Auto-commit delay in ms ───────────────────────────────────────────────────
// Long enough for the player to see the dice face, short enough to feel snappy.
const AUTO_COMMIT_DELAY_MS = 400;

// ─── Machine Definition ────────────────────────────────────────────────────────

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameMachineEvent,
    input: {} as { gameState: GameState; rng: Rng },
  },
}).createMachine({
  id: 'game',
  initial: 'playing',
  context: ({ input }) => ({
    gameState: input.gameState,
    rng: input.rng,
    error: null,
  }),
  states: {
    playing: {
      initial: 'awaitingRoll',
      states: {
        // ── Player must click "Lancer" ──────────────────────────────────────
        awaitingRoll: {
          on: {
            PRE_SELECT_TOKEN: {
              actions: assign(({ context, event }) => {
                const result = applyAction(context.gameState, {
                  type: 'PRE_SELECT_TOKEN',
                  tokenId: event.tokenId,
                });
                if (!result.ok) {
                  return { error: result.message };
                }
                return { gameState: result.state, error: null };
              }),
            },
            ROLL_DICE: {
              target: 'routing',
              actions: assign(({ context }) => {
                const { gameState, rng } = context;
                const nextRng = createRng(rng.state());
                const result = applyAction(gameState, {
                  type: 'ROLL_DICE',
                  rng: nextRng,
                });
                if (!result.ok) {
                  return { error: result.message };
                }
                return {
                  gameState: result.state,
                  rng: nextRng,
                  error: null,
                };
              }),
            },
          },
        },

        // ── Routing hub — reads reducer output and decides next state ───────
        // Evaluated synchronously via `always` guards, top to bottom.
        // ORDER MATTERS: specific conditions before general ones.
        routing: {
          always: [
            // Reducer looped back to AWAITING_ROLL (skip, canceled 6, etc.)
            {
              guard: ({ context }) =>
                context.gameState.turn.phase === 'AWAITING_ROLL',
              target: 'awaitingRoll',
            },
            // Reducer auto-selected single token AND auto-commit is safe
            {
              guard: ({ context }) => shouldAutoCommit(context),
              target: 'autoCommitting',
            },
            // Reducer auto-selected single token but auto-commit not safe
            // (shouldn't happen given current reducer logic, but defensive)
            {
              guard: ({ context }) =>
                context.gameState.turn.phase === 'AWAITING_COMMIT',
              target: 'awaitingCommit',
            },
            // Multiple tokens selectable — user must pick
            {
              guard: ({ context }) =>
                context.gameState.turn.phase === 'AWAITING_MOVE',
              target: 'awaitingMove',
            },
            // Fallback: stay on awaitingRoll (should never reach here)
            { target: 'awaitingRoll' },
          ],
        },

        // ── Auto-commit: brief delay so the player sees the dice result ─────
        // Also accepts manual COMMIT_MOVE in case the user clicks fast.
        autoCommitting: {
          on: {
            COMMIT_MOVE: [
              {
                guard: ({ context }) => canCommitMove(context),
                target: 'committing',
                actions: assign(({ context }) => ({
                  gameState: commitMove(context),
                  error: null,
                })),
              },
              {
                actions: assign(({ context }) => {
                  const result = applyAction(context.gameState, {
                    type: 'COMMIT_MOVE',
                  });
                  return { error: result.ok ? null : result.message };
                }),
              },
            ],
          },
          after: {
            [AUTO_COMMIT_DELAY_MS]: {
              guard: ({ context }) => canCommitMove(context),
              target: 'committing',
              actions: assign(({ context }) => ({
                gameState: commitMove(context),
                error: null,
              })),
            },
          },
        },

        // ── User must select a token ────────────────────────────────────────
        awaitingMove: {
          on: {
            SELECT_TOKEN: {
              target: 'awaitingCommit',
              actions: assign(({ context, event }) => {
                const result = applyAction(context.gameState, {
                  type: 'SELECT_TOKEN',
                  tokenId: event.tokenId,
                });
                if (!result.ok) {
                  return { error: result.message };
                }
                return { gameState: result.state, error: null };
              }),
            },
            CLEAR_ERROR: {
              actions: assign({ error: () => null }),
            },
          },
        },

        // ── User must click "Confirmer" (or deselect) ──────────────────────
        awaitingCommit: {
          on: {
            COMMIT_MOVE: [
              {
                guard: ({ context }) => canCommitMove(context),
                target: 'committing',
                actions: assign(({ context }) => ({
                  gameState: commitMove(context),
                  error: null,
                })),
              },
              {
                actions: assign(({ context }) => {
                  const result = applyAction(context.gameState, {
                    type: 'COMMIT_MOVE',
                  });
                  return { error: result.ok ? null : result.message };
                }),
              },
            ],
            DESELECT_TOKEN: {
              target: 'awaitingMove',
            },
            RANSOM_RETRIEVAL: {
              target: 'committing',
              actions: assign(({ context, event }) => {
                const result = applyAction(context.gameState, {
                  type: 'COMMIT_RANSOM_RETRIEVAL',
                  tokenId: event.tokenId,
                });
                if (!result.ok) {
                  return { error: result.message };
                }
                return { gameState: result.state, error: null };
              }),
            },
            CLEAR_ERROR: {
              actions: assign({ error: () => null }),
            },
          },
        },

        // ── Commit resolved — check for game over, then next roll ───────────
        committing: {
          always: [
            {
              guard: ({ context }) =>
                context.gameState.status === 'game_over',
              target: '#game.gameOver',
            },
            { target: 'awaitingRoll' },
          ],
        },
      },
    },
    gameOver: {
      type: 'final',
      on: {
        RESET_GAME: {
          target: 'playing.awaitingRoll',
        },
      },
    },
  },
});

// ─── Helper Types ──────────────────────────────────────────────────────────────

export type GameMachine = typeof gameMachine;
