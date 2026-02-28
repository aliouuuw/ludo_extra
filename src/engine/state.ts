import { STARTING_SQUARE } from './constants';
import type {
  GameMode,
  GameState,
  Player,
  PlayerColor,
  RuleToggles,
  Token,
  TokenPosition,
} from './types';

// ─── Default Rule Sets ────────────────────────────────────────────────────────

/** Default rule toggles for Extra Mode (the project's primary ruleset). */
export const EXTRA_MODE_DEFAULTS: RuleToggles = {
  territoryCaptures: true,
  ransom: false,
  homeColumnExit: false,
  overshootBehavior: 'stay',
  doubleBlock: false,
  noBonusSix: false,
  threeSesPenalty: false,
  quickStart: false,
} as const;

/** Default rule toggles for Classic Ludo. */
export const CLASSIC_MODE_DEFAULTS: RuleToggles = {
  territoryCaptures: false,
  ransom: false,
  homeColumnExit: false,
  overshootBehavior: 'stay',
  doubleBlock: false,
  noBonusSix: false,
  threeSesPenalty: false,
  quickStart: false,
} as const;

// ─── Player Input ─────────────────────────────────────────────────────────────

export interface PlayerSetup {
  id: string;
  name: string;
  color: PlayerColor;
  isAI: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh, valid GameState ready for play.
 *
 * When rules.quickStart is true, tokens start at their color's designated
 * board square (defined in constants.STARTING_SQUARE) instead of 'start'.
 * Board-01 provides the render coordinate mapping for those squares.
 */
export function createInitialState(params: {
  id: string;
  seed: number;
  mode: GameMode;
  players: PlayerSetup[];
  tokensPerPlayer: 2 | 4;
  rules: RuleToggles;
}): GameState {
  const { id, seed, mode, players, tokensPerPlayer, rules } = params;

  const statePlayers: Player[] = players.map((setup) => {
    const tokens: Token[] = Array.from({ length: tokensPerPlayer }, (_, i) => {
      const position: TokenPosition = rules.quickStart
        ? { zone: 'board', square: STARTING_SQUARE[setup.color] }
        : { zone: 'start' };

      return {
        id: `${setup.color}-${i}`,
        color: setup.color,
        index: i,
        position,
      };
    });

    return {
      id: setup.id,
      color: setup.color,
      name: setup.name,
      tokens,
      isAI: setup.isAI,
      aiDifficulty: setup.aiDifficulty ?? null,
      placement: null,
    };
  });

  return {
    metadata: {
      id,
      startedAt: Date.now(),
      seed,
      mode,
      playerCount: players.length as 2 | 3 | 4,
      tokensPerPlayer,
    },
    players: statePlayers,
    rules,
    turn: {
      phase: 'AWAITING_ROLL',
      activePlayerId: players[0].id,
      diceResult: null,
      consecutiveSixes: 0,
      bonusRollsRemaining: 0,
      selectedTokenId: null,
      validMoveTokenIds: [],
    },
    moveLog: [],
    prisoners: [],
    placements: [],
    status: 'active',
  };
}
