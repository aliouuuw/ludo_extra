import { setup, assign } from 'xstate';
import { applyAction } from '../engine/reducer';
import { createRng } from '../engine/dice';
import type { GameState, Token } from '../engine/types';
import type { Rng } from '../engine/dice';

// ─── Machine Context ───────────────────────────────────────────────────────────

export interface GameMachineContext {
  gameState: GameState;
  rng: Rng;
  error: string | null;
  autoSelected: boolean;
  autoCommitted: boolean;
}

// ─── Machine Events ────────────────────────────────────────────────────────────

export type GameMachineEvent =
  | { type: 'ROLL_DICE' }
  | { type: 'SELECT_TOKEN'; tokenId: string }
  | { type: 'DESELECT_TOKEN' }
  | { type: 'COMMIT_MOVE' }
  | { type: 'RESET_GAME' }
  | { type: 'RANSOM_RETRIEVAL'; tokenId: string }
  | { type: 'CLEAR_ERROR' };

// ─── Helper Functions ───────────────────────────────────────────────────────────

function getActivePlayer(ctx: GameMachineContext) {
  return ctx.gameState.players.find(
    (p) => p.id === ctx.gameState.turn.activePlayerId
  );
}

function getPreferredTokenId(ctx: GameMachineContext): string | null {
  const { validMoveTokenIds } = ctx.gameState.turn;
  const activePlayer = getActivePlayer(ctx);
  if (!activePlayer) return null;

  const validTokens: Token[] = [];
  for (const tokenId of validMoveTokenIds) {
    const token = activePlayer.tokens.find((t) => t.id === tokenId);
    if (token) validTokens.push(token);
  }

  const boardTokens = validTokens.filter((t) => t.position.zone !== 'start');
  const tokensToConsider = boardTokens.length > 0 ? boardTokens : validTokens;

  return tokensToConsider[0]?.id ?? null;
}

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
    autoSelected: false,
    autoCommitted: false,
  }),
  states: {
    playing: {
      initial: 'awaitingRoll',
      states: {
        awaitingRoll: {
          entry: assign({
            autoSelected: () => false,
            autoCommitted: () => false,
          }),
          on: {
            ROLL_DICE: {
              target: 'rolling',
              actions: assign({
                gameState: ({ context }) => {
                  const { gameState, rng } = context;
                  const newRng = createRng(rng.state());
                  const result = applyAction(gameState, {
                    type: 'ROLL_DICE',
                    rng: newRng,
                  });
                  if (!result.ok) {
                    throw new Error(result.message);
                  }
                  return result.state;
                },
                rng: ({ context }) => createRng(context.rng.state()),
                error: () => null,
              }),
            },
          },
        },
        rolling: {
          always: [
            {
              guard: ({ context }) => {
                // Auto-commit when single move, no 6 rolled
                const { validMoveTokenIds, diceResult } = context.gameState.turn;
                const diceValue = diceResult?.value ?? 0;
                return validMoveTokenIds.length === 1 && diceValue !== 6;
              },
              target: 'autoCommitting',
            },
            {
              guard: ({ context }) => {
                // Auto-select when multiple moves but no token selected
                const { validMoveTokenIds, selectedTokenId } = context.gameState.turn;
                return validMoveTokenIds.length > 1 && !selectedTokenId;
              },
              target: 'autoSelecting',
            },
            {
              target: 'awaitingMove',
            },
          ],
        },
        autoSelecting: {
          after: {
            '300': {
              target: 'awaitingCommit',
              actions: assign({
                gameState: ({ context }) => {
                  const preferredId = getPreferredTokenId(context);
                  if (!preferredId) return context.gameState;

                  const result = applyAction(context.gameState, {
                    type: 'SELECT_TOKEN',
                    tokenId: preferredId,
                  });
                  if (!result.ok) {
                    return context.gameState;
                  }
                  return result.state;
                },
                autoSelected: () => true,
              }),
            },
          },
        },
        awaitingMove: {
          on: {
            SELECT_TOKEN: {
              target: 'awaitingCommit',
              actions: assign({
                gameState: ({ context, event }) => {
                  const result = applyAction(context.gameState, {
                    type: 'SELECT_TOKEN',
                    tokenId: event.tokenId,
                  });
                  if (!result.ok) {
                    throw new Error(result.message);
                  }
                  return result.state;
                },
                autoSelected: () => true,
                error: () => null,
              }),
            },
            CLEAR_ERROR: {
              actions: assign({ error: () => null }),
            },
          },
        },
        awaitingCommit: {
          on: {
            COMMIT_MOVE: {
              target: 'committing',
              actions: assign({
                gameState: ({ context }) => {
                  const result = applyAction(context.gameState, {
                    type: 'COMMIT_MOVE',
                  });
                  if (!result.ok) {
                    throw new Error(result.message);
                  }
                  return result.state;
                },
                autoCommitted: () => true,
                error: () => null,
              }),
            },
            DESELECT_TOKEN: {
              target: 'awaitingMove',
              actions: assign({
                autoSelected: () => false,
              }),
            },
            RANSOM_RETRIEVAL: {
              target: 'committing',
              actions: assign({
                gameState: ({ context, event }) => {
                  const result = applyAction(context.gameState, {
                    type: 'COMMIT_RANSOM_RETRIEVAL',
                    tokenId: event.tokenId,
                  });
                  if (!result.ok) {
                    throw new Error(result.message);
                  }
                  return result.state;
                },
                autoCommitted: () => true,
                error: () => null,
              }),
            },
            CLEAR_ERROR: {
              actions: assign({ error: () => null }),
            },
          },
        },
        autoCommitting: {
          after: {
            '120': {
              target: 'committing',
              actions: assign({
                gameState: ({ context }) => {
                  const result = applyAction(context.gameState, {
                    type: 'COMMIT_MOVE',
                  });
                  if (!result.ok) {
                    throw new Error(result.message);
                  }
                  return result.state;
                },
                autoCommitted: () => true,
                error: () => null,
              }),
            },
          },
        },
        committing: {
          always: [
            {
              guard: ({ context }) => context.gameState.status === 'game_over',
              target: '#game.gameOver',
            },
            {
              target: 'awaitingRoll',
            },
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
