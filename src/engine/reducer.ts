import { applyCaptureDisplacement, resolveCaptureAtSquare } from './capture';
import { rollDice, updateConsecutiveSixes, bonusRollsFromDice } from './dice';
import {
  applyHomeColumnCaptureDisplacement,
  applyRansomRetrieval,
  augmentSelectableTokensForExtraMode,
  canCaptureAtSquare,
  computeHomeColumnExit,
  getRetrievablePrisoners,
  resolveTerritoryCapture,
} from './extra-rules';
import { computeDestination, getSelectableTokenIds, isSamePosition } from './movement';
import type {
  ActionErrorCode,
  DiceValue,
  GameState,
  MoveLogEntry,
  MoveType,
  Prisoner,
  Token,
  TokenPosition,
} from './types';
import { assertValidState } from './invariants';
import { applyWinDetection } from './win';
import { applyThreeSixesPenalty, filterDoubleBlockedTokens } from './rule-variants';
import type { Rng } from './dice';

// ─── Actions ──────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'ROLL_DICE'; rng: Rng }
  | { type: 'SELECT_TOKEN'; tokenId: string }
  | { type: 'COMMIT_MOVE' }
  | { type: 'COMMIT_RANSOM_RETRIEVAL'; tokenId: string };

// ─── Action Result ────────────────────────────────────────────────────────────

export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: ActionErrorCode; message: string };

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * Pure turn reducer. Takes the current GameState and a GameAction, returns
 * a new GameState (never mutates the input) or an error.
 *
 * All game rules are encoded here. This is the single point of authority for
 * state transitions — the UI and AI must go through this function.
 */
export function applyAction(state: GameState, action: GameAction): ActionResult {
  if (state.status === 'game_over') {
    return err('GAME_OVER', 'The game is over; no further actions are accepted.');
  }

  switch (action.type) {
    case 'ROLL_DICE':      return handleRollDice(state, action.rng);
    case 'SELECT_TOKEN':   return handleSelectToken(state, action.tokenId);
    case 'COMMIT_MOVE':    return handleCommitMove(state);
    case 'COMMIT_RANSOM_RETRIEVAL': return handleRansomRetrieval(state, action.tokenId);
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return err('WRONG_PHASE', 'Unknown action type.');
    }
  }
}

// ─── ROLL_DICE ────────────────────────────────────────────────────────────────

function handleRollDice(state: GameState, rng: Rng): ActionResult {
  if (state.turn.phase !== 'AWAITING_ROLL') {
    return err('WRONG_PHASE', `Cannot roll dice in phase "${state.turn.phase}".`);
  }

  const roll = rollDice(rng, state.turn.consecutiveSixes, state.rules);
  const newConsecutiveSixes = updateConsecutiveSixes(state.turn.consecutiveSixes, roll);

  // Canceled roll (3rd consecutive 6): turn ends, apply penalty if enabled
  if (roll.canceled) {
    const lastTokenId = state.moveLog.length > 0
      ? state.moveLog[state.moveLog.length - 1].tokenId
      : null;

    const penalizedPlayers = state.rules.threeSesPenalty
      ? applyThreeSixesPenalty(getActivePlayer(state), lastTokenId, state.players)
      : state.players;

    const nextPlayerId = getNextPlayerId({ ...state, players: penalizedPlayers });
    return ok({
      ...state,
      players: penalizedPlayers,
      turn: {
        ...state.turn,
        phase: 'AWAITING_ROLL',
        diceResult: roll,
        consecutiveSixes: 0,
        bonusRollsRemaining: 0,
        selectedTokenId: null,
        validMoveTokenIds: [],
        activePlayerId: nextPlayerId,
      },
    });
  }

  // Compute selectable tokens for Classic rules
  const activePlayer = getActivePlayer(state);
  const baseSelectable = getSelectableTokenIds(
    activePlayer.tokens,
    roll.value as DiceValue,
    state.rules.overshootBehavior
  );

  // Build destination map for double-block filtering (board destinations only)
  const destinationMap = new Map<string, number>();
  for (const token of activePlayer.tokens) {
    const dest = computeDestination(
      token.position,
      roll.value as DiceValue,
      token.color,
      state.rules.overshootBehavior
    );
    if (dest?.zone === 'board') {
      destinationMap.set(token.id, dest.square);
    }
  }

  // Filter double-blocked destinations
  const filteredSelectable = filterDoubleBlockedTokens({
    selectableTokenIds: baseSelectable,
    activePlayer,
    destinationMap,
    allPlayers: state.players,
    rules: state.rules,
  });

  // Augment for Extra Mode (uses double-block-filtered list as base)
  const { selectableTokenIds, ransomRetrievalAvailable } =
    augmentSelectableTokensForExtraMode({
      baseSelectableTokenIds: filteredSelectable,
      activePlayer,
      roll: roll.value as DiceValue,
      prisoners: state.prisoners,
      rules: state.rules,
    });

  // No moves available and no ransom retrieval: auto-skip
  if (selectableTokenIds.length === 0 && !ransomRetrievalAvailable) {
    const bonusRemaining = bonusRollsFromDice(roll) + state.turn.bonusRollsRemaining;
    const logEntry = buildLogEntry(state, roll, 'SKIP', null, null, null, [], null);

    if (bonusRemaining > 0) {
      // Player retains bonus roll(s) even on skip
      return ok({
        ...state,
        moveLog: [...state.moveLog, logEntry],
        turn: {
          ...state.turn,
          phase: 'AWAITING_ROLL',
          diceResult: roll,
          consecutiveSixes: newConsecutiveSixes,
          bonusRollsRemaining: bonusRemaining - 1,
          selectedTokenId: null,
          validMoveTokenIds: [],
        },
      });
    }

    const nextPlayerId = getNextPlayerId(state);
    return ok({
      ...state,
      moveLog: [...state.moveLog, logEntry],
      turn: {
        ...state.turn,
        phase: 'AWAITING_ROLL',
        diceResult: roll,
        consecutiveSixes: 0,
        bonusRollsRemaining: 0,
        selectedTokenId: null,
        validMoveTokenIds: [],
        activePlayerId: nextPlayerId,
      },
    });
  }

  return ok({
    ...state,
    turn: {
      ...state.turn,
      phase: 'AWAITING_MOVE',
      diceResult: roll,
      consecutiveSixes: newConsecutiveSixes,
      bonusRollsRemaining: state.turn.bonusRollsRemaining + bonusRollsFromDice(roll),
      selectedTokenId: null,
      validMoveTokenIds: selectableTokenIds,
    },
  });
}

// ─── SELECT_TOKEN ─────────────────────────────────────────────────────────────

function handleSelectToken(state: GameState, tokenId: string): ActionResult {
  if (state.turn.phase !== 'AWAITING_MOVE') {
    return err('WRONG_PHASE', `Cannot select a token in phase "${state.turn.phase}".`);
  }

  if (!state.turn.validMoveTokenIds.includes(tokenId)) {
    return err('TOKEN_NOT_SELECTABLE', `Token "${tokenId}" is not selectable for the current roll.`);
  }

  return ok({
    ...state,
    turn: {
      ...state.turn,
      phase: 'AWAITING_COMMIT',
      selectedTokenId: tokenId,
    },
  });
}

// ─── COMMIT_MOVE ──────────────────────────────────────────────────────────────

function handleCommitMove(state: GameState): ActionResult {
  if (state.turn.phase !== 'AWAITING_COMMIT') {
    return err('WRONG_PHASE', `Cannot commit a move in phase "${state.turn.phase}".`);
  }

  const { selectedTokenId, diceResult } = state.turn;

  if (!selectedTokenId) {
    return err('NO_TOKEN_SELECTED', 'No token is selected.');
  }
  if (!diceResult) {
    return err('NO_DICE_RESULT', 'No dice result available.');
  }

  const activePlayer = getActivePlayer(state);
  const token = activePlayer.tokens.find((t) => t.id === selectedTokenId);

  if (!token) {
    return err('TOKEN_NOT_SELECTABLE', `Token "${selectedTokenId}" not found for active player.`);
  }

  // Home column exit (Extra Mode)
  const homeExitDest = computeHomeColumnExit(token, diceResult.value as DiceValue, state.rules);

  // Standard destination
  const standardDest = computeDestination(
    token.position,
    diceResult.value as DiceValue,
    token.color,
    state.rules.overshootBehavior
  );

  const destination = homeExitDest ?? standardDest;

  if (!destination || isSamePosition(token.position, destination)) {
    return err('INVALID_MOVE', 'The selected token has no valid destination.');
  }

  // ── Apply displacement to token ──────────────────────────────────────────
  let updatedPlayers = state.players.map((p) => {
    if (p.id !== activePlayer.id) return p;
    return {
      ...p,
      tokens: p.tokens.map((t): Token => {
        if (t.id !== selectedTokenId) return t;
        return { ...t, position: destination };
      }),
    };
  });

  // ── Capture resolution ────────────────────────────────────────────────────
  let capturedTokenIds: readonly string[] = [];
  let newPrisoners: Prisoner[] = [];
  let captureBonus = 0;

  if (destination.zone === 'board') {
    // Stack guard (Extra Mode)
    const landingIds = [selectedTokenId];
    const canCapture = canCaptureAtSquare(landingIds, destination.square, token.color, updatedPlayers);

    if (canCapture) {
      const captureResult = resolveCaptureAtSquare(destination, token.color, updatedPlayers, state.rules);

      if (captureResult.captures) {
        capturedTokenIds = captureResult.capturedTokenIds;
        captureBonus = captureResult.bonusRollGranted ? 1 : 0;

        const displaced = applyCaptureDisplacement({
          capturedTokenIds,
          allPlayers: updatedPlayers,
          capturingPlayerId: activePlayer.id,
          turnNumber: state.moveLog.length,
          rules: state.rules,
        });

        updatedPlayers = displaced.updatedPlayers;
        newPrisoners = displaced.newPrisoners;
      }
    }
  }

  // ── Territory capture in home column (Extra Mode) ─────────────────────────
  if (destination.zone === 'home_column' && state.rules.territoryCaptures) {
    const homeCapturedIds = resolveTerritoryCapture(destination, token.color, updatedPlayers, state.rules);
    if (homeCapturedIds.length > 0) {
      capturedTokenIds = [...capturedTokenIds, ...homeCapturedIds];
      updatedPlayers = applyHomeColumnCaptureDisplacement(homeCapturedIds, updatedPlayers);
      captureBonus = 1;
    }
  }

  // ── Determine move type ───────────────────────────────────────────────────
  const moveType = deriveMoveType(token.position, destination, capturedTokenIds.length > 0);

  // ── Build log entry ───────────────────────────────────────────────────────
  const logEntry = buildLogEntry(
    state,
    diceResult,
    moveType,
    selectedTokenId,
    token.position,
    destination,
    capturedTokenIds,
    null
  );

  // ── Compute next turn state ───────────────────────────────────────────────
  const totalBonusRemaining = state.turn.bonusRollsRemaining - 1 + captureBonus;
  const updatedPrisoners = [...state.prisoners, ...newPrisoners];

  const nextState = buildNextTurnState({
    state: {
      ...state,
      players: updatedPlayers,
      prisoners: updatedPrisoners,
      moveLog: [...state.moveLog, logEntry],
    },
    totalBonusRemaining,
  });

  const { state: stateAfterWin } = applyWinDetection(nextState);
  assertValidState(stateAfterWin);
  return ok(stateAfterWin);
}

// ─── COMMIT_RANSOM_RETRIEVAL ──────────────────────────────────────────────────

function handleRansomRetrieval(state: GameState, tokenId: string): ActionResult {
  if (state.turn.phase !== 'AWAITING_MOVE') {
    return err('WRONG_PHASE', `Cannot retrieve a prisoner in phase "${state.turn.phase}".`);
  }
  if (!state.rules.ransom) {
    return err('INVALID_MOVE', 'Ransom rule is not enabled for this match.');
  }
  if (!state.turn.diceResult || state.turn.diceResult.value !== 6) {
    return err('INVALID_MOVE', 'Ransom retrieval requires a roll of 6.');
  }

  const activePlayer = getActivePlayer(state);
  const retrievable = getRetrievablePrisoners(
    activePlayer.id,
    activePlayer.color,
    state.prisoners,
    state.players
  );

  const prisoner = retrievable.find((p) => p.tokenId === tokenId);
  if (!prisoner) {
    return err('TOKEN_NOT_SELECTABLE', `Token "${tokenId}" is not a retrievable prisoner.`);
  }

  const { updatedPlayers, updatedPrisoners } = applyRansomRetrieval({
    tokenId,
    allPlayers: state.players,
    prisoners: state.prisoners,
  });

  const logEntry = buildLogEntry(
    state,
    state.turn.diceResult,
    'RANSOM_RETRIEVAL',
    tokenId,
    null,
    { zone: 'start' },
    [],
    tokenId
  );

  const totalBonusRemaining = state.turn.bonusRollsRemaining - 1;
  const nextState = buildNextTurnState({
    state: {
      ...state,
      players: updatedPlayers,
      prisoners: updatedPrisoners,
      moveLog: [...state.moveLog, logEntry],
    },
    totalBonusRemaining,
  });

  const { state: stateAfterWin } = applyWinDetection(nextState);
  assertValidState(stateAfterWin);
  return ok(stateAfterWin);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActivePlayer(state: GameState) {
  const player = state.players.find((p) => p.id === state.turn.activePlayerId);
  if (!player) throw new Error(`Active player "${state.turn.activePlayerId}" not found.`);
  return player;
}

function getNextPlayerId(state: GameState): string {
  const activePlayers = state.players.filter((p) => p.placement === null);
  if (activePlayers.length === 0) return state.turn.activePlayerId;

  const currentIndex = activePlayers.findIndex((p) => p.id === state.turn.activePlayerId);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
}

function buildNextTurnState(params: {
  state: GameState;
  totalBonusRemaining: number;
}): GameState {
  const { state, totalBonusRemaining } = params;

  if (totalBonusRemaining > 0) {
    // Active player retains the turn with a bonus roll
    return {
      ...state,
      turn: {
        ...state.turn,
        phase: 'AWAITING_ROLL',
        diceResult: null,
        bonusRollsRemaining: totalBonusRemaining,
        selectedTokenId: null,
        validMoveTokenIds: [],
      },
    };
  }

  // Advance to next player
  const nextPlayerId = getNextPlayerId(state);
  return {
    ...state,
    turn: {
      ...state.turn,
      phase: 'AWAITING_ROLL',
      diceResult: null,
      consecutiveSixes: 0,
      bonusRollsRemaining: 0,
      selectedTokenId: null,
      validMoveTokenIds: [],
      activePlayerId: nextPlayerId,
    },
  };
}

function deriveMoveType(
  from: TokenPosition,
  to: TokenPosition,
  isCapture: boolean
): MoveType {
  if (isCapture) return 'CAPTURE';
  if (from.zone === 'start') return 'START_TOKEN';
  if (to.zone === 'home') return 'FINISH';
  if (from.zone === 'home_column' && to.zone === 'board') return 'HOME_COLUMN_EXIT';
  if (from.zone === 'board' && to.zone === 'home_column') return 'ENTER_HOME_COLUMN';
  if (from.zone === 'home_column' && to.zone === 'home_column') return 'ADVANCE_HOME_COLUMN';
  return 'MOVE_TOKEN';
}

function buildLogEntry(
  state: GameState,
  diceResult: NonNullable<GameState['turn']['diceResult']>,
  type: MoveType,
  tokenId: string | null,
  fromPosition: TokenPosition | null,
  toPosition: TokenPosition | null,
  capturedTokenIds: readonly string[],
  ransomRetrievedTokenId: string | null
): MoveLogEntry {
  return {
    turnNumber: state.moveLog.length,
    playerId: state.turn.activePlayerId,
    dice: diceResult,
    type,
    tokenId,
    fromPosition,
    toPosition,
    capturedTokenIds,
    ransomRetrievedTokenId,
    timestamp: Date.now(),
  };
}

function ok(state: GameState): ActionResult {
  return { ok: true, state };
}

function err(error: ActionErrorCode, message: string): ActionResult {
  return { ok: false, error, message };
}
