import type { GameState, TokenPosition, Token, Player } from './types';

// ─── Development-Only Assertions ───────────────────────────────────────────────

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

function assert(condition: boolean, message: string): void {
  if (isDev && !condition) {
    throw new Error(`[Game Engine Assertion] ${message}`);
  }
}

// ─── Position Assertions ─────────────────────────────────────────────────────

export function assertValidPosition(pos: TokenPosition, context?: string): void {
  const prefix = context ? `[${context}] ` : '';

  switch (pos.zone) {
    case 'start':
    case 'home':
      // Always valid
      break;
    case 'board':
      assert(
        pos.square >= 0 && pos.square < 52,
        `${prefix}Board square must be in [0, 51], got ${pos.square}`
      );
      break;
    case 'home_column':
      assert(
        pos.index >= 0 && pos.index < 5,
        `${prefix}Home column index must be in [0, 4], got ${pos.index}`
      );
      break;
    default: {
      const _exhaustive: never = pos;
      assert(false, `${prefix}Unknown zone: ${_exhaustive}`);
    }
  }
}

// ─── Token Assertions ──────────────────────────────────────────────────────────

export function assertValidToken(token: Token, player: Player, context?: string): void {
  const prefix = context ? `[${context}] ` : '';

  assert(
    token.color === player.color,
    `${prefix}Token ${token.id} color ${token.color} does not match player ${player.id} color ${player.color}`
  );

  assertValidPosition(token.position, `token ${token.id}`);
}

// ─── Turn State Assertions ─────────────────────────────────────────────────────

export function assertValidTurnState(state: GameState): void {
  assert(
    state.turn.consecutiveSixes >= 0 && state.turn.consecutiveSixes <= 2,
    `consecutiveSixes must be in [0, 2], got ${state.turn.consecutiveSixes}`
  );

  assert(
    state.turn.bonusRollsRemaining >= 0,
    `bonusRollsRemaining must be >= 0, got ${state.turn.bonusRollsRemaining}`
  );

  // Validate active player exists
  const activePlayer = state.players.find((p) => p.id === state.turn.activePlayerId);
  assert(
    activePlayer !== undefined,
    `Active player ${state.turn.activePlayerId} not found in players array`
  );

  // Validate selected token if any
  if (state.turn.selectedTokenId) {
    const allTokens = state.players.flatMap((p) => p.tokens);
    const selectedToken = allTokens.find((t) => t.id === state.turn.selectedTokenId);
    assert(
      selectedToken !== undefined,
      `Selected token ${state.turn.selectedTokenId} not found`
    );

    // Validate selected token belongs to active player
    if (activePlayer) {
      assert(
        activePlayer.tokens.some((t) => t.id === state.turn.selectedTokenId),
        `Selected token ${state.turn.selectedTokenId} does not belong to active player ${activePlayer.id}`
      );
    }
  }

  // Validate validMoveTokenIds exist
  for (const tokenId of state.turn.validMoveTokenIds) {
    const allTokens = state.players.flatMap((p) => p.tokens);
    const token = allTokens.find((t) => t.id === tokenId);
    assert(token !== undefined, `Valid move token ${tokenId} not found`);
  }

  // Validate phase consistency
  switch (state.turn.phase) {
    case 'AWAITING_ROLL':
      assert(
        state.turn.diceResult === null,
        'AWAITING_ROLL phase must have null diceResult'
      );
      assert(
        state.turn.selectedTokenId === null,
        'AWAITING_ROLL phase must have null selectedTokenId'
      );
      assert(
        state.turn.validMoveTokenIds.length === 0,
        'AWAITING_ROLL phase must have empty validMoveTokenIds'
      );
      break;

    case 'AWAITING_MOVE':
      assert(
        state.turn.diceResult !== null,
        'AWAITING_MOVE phase must have diceResult'
      );
      assert(
        state.turn.selectedTokenId === null,
        'AWAITING_MOVE phase must have null selectedTokenId'
      );
      assert(
        state.turn.validMoveTokenIds.length > 0,
        'AWAITING_MOVE phase must have validMoveTokenIds'
      );
      break;

    case 'AWAITING_COMMIT':
      assert(
        state.turn.diceResult !== null,
        'AWAITING_COMMIT phase must have diceResult'
      );
      assert(
        state.turn.selectedTokenId !== null,
        'AWAITING_COMMIT phase must have selectedTokenId'
      );
      break;

    case 'PROCESSING':
      // PROCESSING phase has minimal constraints
      break;

    case 'GAME_OVER':
      assert(
        state.status === 'game_over',
        'GAME_OVER phase requires status === game_over'
      );
      break;

    default: {
      const _exhaustive: never = state.turn.phase;
      assert(false, `Unknown phase: ${_exhaustive}`);
    }
  }
}

// ─── Game State Assertions ─────────────────────────────────────────────────────

export function assertValidGameState(state: GameState, context?: string): void {
  const prefix = context ? `[${context}] ` : '';

  // Validate player count
  assert(
    state.players.length === state.metadata.playerCount,
    `${prefix}Player count mismatch: ${state.players.length} vs metadata ${state.metadata.playerCount}`
  );

  // Validate token counts
  for (const player of state.players) {
    assert(
      player.tokens.length === state.metadata.tokensPerPlayer,
      `${prefix}Player ${player.id} has ${player.tokens.length} tokens, expected ${state.metadata.tokensPerPlayer}`
    );

    for (const token of player.tokens) {
      assertValidToken(token, player, context);
    }
  }

  // Validate turn state
  assertValidTurnState(state);

  // Validate prisoners
  if (!state.rules.ransom) {
    assert(
      state.prisoners.length === 0,
      `${prefix}Prisoners must be empty when ransom rule is disabled`
    );
  }

  // Validate placements
  const placedPlayers = new Set<string>();
  for (const playerId of state.placements) {
    assert(
      state.players.some((p) => p.id === playerId),
      `${prefix}Placement references unknown player ${playerId}`
    );
    assert(
      !placedPlayers.has(playerId),
      `${prefix}Duplicate placement for player ${playerId}`
    );
    placedPlayers.add(playerId);
  }

  // Validate status consistency
  if (state.status === 'game_over') {
    assert(
      state.placements.length > 0,
      `${prefix}Game over status requires at least one placement`
    );
  }
}

// ─── Pre/Post Condition Assertions ───────────────────────────────────────────

export function assertPreRollState(state: GameState): void {
  assertValidGameState(state, 'pre-roll');
  assert(
    state.turn.phase === 'AWAITING_ROLL',
    `Expected AWAITING_ROLL phase, got ${state.turn.phase}`
  );
}

export function assertPostRollState(state: GameState, prevState: GameState): void {
  assertValidGameState(state, 'post-roll');
  assert(
    state.turn.phase === 'AWAITING_MOVE' || state.turn.phase === 'AWAITING_ROLL',
    `Expected AWAITING_MOVE or AWAITING_ROLL after roll, got ${state.turn.phase}`
  );

  // If dice was rolled, it should be different from before
  if (state.turn.diceResult && !prevState.turn.diceResult) {
    assert(
      state.turn.diceResult.value >= 1 && state.turn.diceResult.value <= 6,
      `Dice result must be in [1, 6], got ${state.turn.diceResult.value}`
    );
  }
}

export function assertPreCommitState(state: GameState): void {
  assertValidGameState(state, 'pre-commit');
  assert(
    state.turn.phase === 'AWAITING_COMMIT',
    `Expected AWAITING_COMMIT phase, got ${state.turn.phase}`
  );
  assert(
    state.turn.selectedTokenId !== null,
    'Expected selectedTokenId before commit'
  );
}

export function assertPostCommitState(state: GameState, prevState: GameState): void {
  assertValidGameState(state, 'post-commit');

  // Turn should have advanced (or stayed for bonus)
  assert(
    state.turn.phase === 'AWAITING_ROLL',
    `Expected AWAITING_ROLL after commit, got ${state.turn.phase}`
  );

  // Selected token should be cleared
  assert(
    state.turn.selectedTokenId === null,
    'selectedTokenId should be null after commit'
  );

  // Move log should have new entry
  assert(
    state.moveLog.length === prevState.moveLog.length + 1,
    'Move log should have new entry after commit'
  );
}
