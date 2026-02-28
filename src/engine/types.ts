// ─── Primitives ───────────────────────────────────────────────────────────────

export type PlayerColor = 'red' | 'yellow' | 'green' | 'blue';

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export type GameMode = 'extra' | 'classic';

export type GameStatus = 'setup' | 'active' | 'game_over';

export type TurnPhase =
  | 'AWAITING_ROLL'    // player must roll the dice
  | 'AWAITING_MOVE'    // player has rolled, must select a token to move
  | 'AWAITING_COMMIT'  // player has selected a token, must confirm the move
  | 'PROCESSING'       // engine is applying the committed move
  | 'GAME_OVER';       // the match has ended; no further actions accepted

export type MoveType =
  | 'START_TOKEN'          // bring a token out of start onto the board (requires roll of 6)
  | 'MOVE_TOKEN'           // advance a token along the common path
  | 'CAPTURE'              // land on opponent token, sending it back (or to prison)
  | 'ENTER_HOME_COLUMN'    // token moves from common path into its home column
  | 'ADVANCE_HOME_COLUMN'  // token advances within the home column
  | 'FINISH'               // token reaches the center home (wins for that token)
  | 'HOME_COLUMN_EXIT'     // Extra Mode: token exits home column on a roll of 6
  | 'RANSOM_RETRIEVAL'     // Extra Mode: player uses a roll of 6 to retrieve a prisoner
  | 'SKIP';                // no legal move available; turn passes automatically

// ─── Token Position ───────────────────────────────────────────────────────────

/**
 * Describes where a token is on the game board at any point.
 *
 *   start        — token is in its starting yard; not yet on the common path
 *   board        — token is on the 52-square common path (square: 0–51)
 *   home_column  — token is in the 5-square colored approach to center (index: 0–4)
 *   home         — token has reached the center home; it is permanently finished
 *
 * board.square 0–51 and home_column.index 0–4 are validated by invariants.
 */
export type TokenPosition =
  | { readonly zone: 'start' }
  | { readonly zone: 'board'; readonly square: number }
  | { readonly zone: 'home_column'; readonly index: number }
  | { readonly zone: 'home' };

// ─── Token ────────────────────────────────────────────────────────────────────

export interface Token {
  /** Globally unique identifier, e.g. "red-0", "blue-3" */
  readonly id: string;
  readonly color: PlayerColor;
  /** 0-based index within the player's token set */
  readonly index: number;
  position: TokenPosition;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  readonly id: string;
  readonly color: PlayerColor;
  name: string;
  tokens: Token[];
  isAI: boolean;
  /** null when the player is human */
  aiDifficulty: 'easy' | 'medium' | 'hard' | null;
  /** Finishing rank (1 = first to complete all tokens). null while still playing. */
  placement: number | null;
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

export interface DiceRoll {
  readonly value: DiceValue;
  /**
   * True when this is the 3rd consecutive 6 and the roll is canceled per rules.
   * No move is allowed on a canceled roll.
   */
  readonly canceled: boolean;
  /**
   * True when this roll grants a bonus roll (rolling a non-canceled 6).
   * False when noBonusSix rule is active.
   */
  readonly bonusGranted: boolean;
  /**
   * Snapshot of the RNG state before this roll, for deterministic replay.
   * The exact format is defined in engine-02.
   */
  readonly rngSnapshot: number;
}

// ─── Move Log ─────────────────────────────────────────────────────────────────

export interface MoveLogEntry {
  readonly turnNumber: number;
  readonly playerId: string;
  readonly dice: DiceRoll;
  readonly type: MoveType;
  /** null for SKIP moves */
  readonly tokenId: string | null;
  readonly fromPosition: TokenPosition | null;
  readonly toPosition: TokenPosition | null;
  /** Token IDs sent back to start (or to prison) by this capture */
  readonly capturedTokenIds: readonly string[];
  /** Token ID freed from ransom by this retrieval move, or null */
  readonly ransomRetrievedTokenId: string | null;
  /** Unix timestamp ms when the move was committed */
  readonly timestamp: number;
}

// ─── Ransom / Prisoners ───────────────────────────────────────────────────────

/**
 * A prisoner is a token captured under Extra Mode ransom rules.
 * Instead of returning immediately to start, the token remains in prison until
 * its owner rolls a 6 and elects to retrieve it.
 */
export interface Prisoner {
  readonly tokenId: string;
  readonly capturedByPlayerId: string;
  /** Turn number when the capture occurred */
  readonly capturedAtTurn: number;
}

// ─── Rule Toggles ─────────────────────────────────────────────────────────────

/**
 * All Extra Mode rules are individually togglable per match.
 *
 * Classic Mode defaults: all false, overshootBehavior = 'stay'.
 * Extra Mode defaults: territoryCaptures = true, rest configurable.
 */
export interface RuleToggles {
  /**
   * Extra Mode: captures are allowed on safe squares.
   * When true, safe squares lose their immunity.
   */
  readonly territoryCaptures: boolean;
  /**
   * Extra Mode: a captured token becomes a prisoner instead of returning
   * immediately to start. Owner must roll a 6 to retrieve it.
   */
  readonly ransom: boolean;
  /**
   * Extra Mode: a token in its home column can exit back to the common path
   * on a roll of 6.
   */
  readonly homeColumnExit: boolean;
  /**
   * Behavior when a token's roll overshoots the center home:
   *   'stay'   — token does not move (default per project spec)
   *   'bounce' — token bounces backward by the excess steps
   */
  readonly overshootBehavior: 'stay' | 'bounce';
  /**
   * Two same-color tokens on the same square block opponents from landing there.
   */
  readonly doubleBlock: boolean;
  /** Rolling 6 does NOT grant an extra roll (disables bonus roll mechanic). */
  readonly noBonusSix: boolean;
  /**
   * When the third consecutive 6 is rolled, the last moved token is sent
   * back to start (instead of just canceling the roll).
   */
  readonly threeSesPenalty: boolean;
  /**
   * All tokens begin on their designated starting squares on the board
   * without requiring a roll of 6 to enter.
   */
  readonly quickStart: boolean;
}

// ─── Turn State ───────────────────────────────────────────────────────────────

export interface TurnState {
  phase: TurnPhase;
  readonly activePlayerId: string;
  /** The result of the current roll. null before the player has rolled. */
  diceResult: DiceRoll | null;
  /**
   * Count of consecutive 6s rolled so far in this turn sequence.
   * Valid range: 0–2. A third 6 is caught at roll time and either cancels
   * or applies threeSesPenalty before reaching this field.
   */
  consecutiveSixes: number;
  /** Additional rolls pending (from captures or non-canceled 6 rolls). */
  bonusRollsRemaining: number;
  /** The token ID the player has selected for the current move, or null. */
  selectedTokenId: string | null;
  /** Token IDs that are legal to move for the current dice result. */
  validMoveTokenIds: readonly string[];
}

// ─── Match Metadata ───────────────────────────────────────────────────────────

export interface MatchMetadata {
  readonly id: string;
  /** Unix timestamp ms when the match was created */
  readonly startedAt: number;
  /** Seed for the deterministic RNG; required for replay reconstruction */
  readonly seed: number;
  readonly mode: GameMode;
  readonly playerCount: 2 | 3 | 4;
  /** 2 = quick mode, 4 = standard */
  readonly tokensPerPlayer: 2 | 4;
}

// ─── Full Game State ──────────────────────────────────────────────────────────

/**
 * The canonical game state. Fully serializable (no functions, no class instances).
 * All mutations must go through the turn reducer (engine-06).
 * Never mutate this object directly.
 *
 * Invariants enforced by validateGameState in invariants.ts:
 *   I1.  players.length === metadata.playerCount
 *   I2.  Each player has exactly metadata.tokensPerPlayer tokens
 *   I3.  All token IDs are globally unique; token.color matches player.color
 *   I4.  board.square is an integer in [0, BOARD_SQUARE_COUNT - 1]
 *   I5.  home_column.index is an integer in [0, HOME_COLUMN_LENGTH - 1]
 *   I6.  No common path square is simultaneously occupied by tokens of
 *        more than one color (after full move resolution)
 *   I7.  prisoners only contains tokens whose color differs from the captor's color;
 *        all referenced IDs must exist
 *   I8.  prisoners is empty when rules.ransom === false
 *   I9.  placements has no duplicates and all IDs reference known players
 *   I10. turn.consecutiveSixes is an integer in [0, 2]
 *   I11. turn.activePlayerId references a player in the players array
 */
export interface GameState {
  readonly metadata: MatchMetadata;
  players: Player[];
  readonly rules: RuleToggles;
  turn: TurnState;
  moveLog: MoveLogEntry[];
  /**
   * Active ransom prisoners. Always present as an array.
   * Must be empty when rules.ransom === false (invariant I8).
   */
  prisoners: Prisoner[];
  /** Player IDs in finishing order. First element = 1st place. */
  placements: string[];
  status: GameStatus;
}

// ─── Action Error Codes ───────────────────────────────────────────────────────

/**
 * Standardized error codes returned by the turn reducer when an action is rejected.
 * Defined here so UI and engine share the same vocabulary.
 */
export type ActionErrorCode =
  | 'NOT_YOUR_TURN'
  | 'WRONG_PHASE'
  | 'NO_DICE_RESULT'
  | 'TOKEN_NOT_SELECTABLE'
  | 'NO_TOKEN_SELECTED'
  | 'GAME_OVER'
  | 'INVALID_MOVE';

// ─── Validation Result ────────────────────────────────────────────────────────

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
