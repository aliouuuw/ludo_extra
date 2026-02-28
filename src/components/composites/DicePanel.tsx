/*
 * Purpose: Displays the current dice result and Roll/Commit action buttons.
 * Variants: awaiting-roll, awaiting-move, awaiting-commit, game-over
 * Props:
 *   phase         — current TurnPhase
 *   diceValue     — current roll value (null before first roll)
 *   canceled      — true when the roll was canceled (3rd consecutive 6)
 *   bonusGranted  — true when the roll grants a bonus roll
 *   activePlayerName — display name of the current player
 *   activePlayerColor — color of the current player
 *   onRoll        — called when Roll button is pressed
 *   onCommit      — called when Confirm Move button is pressed
 *   error         — optional error message to display
 * States: awaiting-roll, awaiting-move (token selection needed), awaiting-commit, game-over
 * Usage: <DicePanel phase={turn.phase} diceValue={turn.diceResult?.value} ... />
 * Do not use when: rendering replay (read-only mode)
 */

import type { DiceValue, TurnPhase, PlayerColor, GameState } from '../../engine/types';

interface DicePanelProps {
  gameState: GameState;
  phase: TurnPhase;
  diceValue: DiceValue | null;
  canceled?: boolean;
  bonusGranted?: boolean;
  bonusRollsRemaining?: number;
  activePlayerName: string;
  activePlayerColor: PlayerColor;
  onRoll: () => void;
  onCommit: () => void;
  error: string | null;
}

const PLAYER_COLOR_MAP: Record<PlayerColor, string> = {
  red:    'var(--color-player-red)',
  yellow: 'var(--color-player-yellow)',
  green:  'var(--color-player-green)',
  blue:   'var(--color-player-blue)',
};

const DICE_FACES: Record<DiceValue, string> = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

function getPhaseLabel(
  phase: TurnPhase, 
  playerName: string, 
  canceled: boolean,
  requiresPreSelection: boolean
): string {
  if (phase === 'GAME_OVER') return 'Partie terminée !';
  if (canceled) return `${playerName} — 3 fois 6, tour annulé !`;
  switch (phase) {
    case 'AWAITING_ROLL':   
      return requiresPreSelection 
        ? `${playerName} — Sélectionnez un pion` 
        : `${playerName} — Lancez le dé`;
    case 'AWAITING_MOVE':   return `${playerName} — Choisissez un pion`;
    case 'AWAITING_COMMIT': return `${playerName} — Confirmez le déplacement`;
    case 'PROCESSING':      return `${playerName} — En cours…`;
  }
}

export function DicePanel({
  gameState,
  phase,
  diceValue,
  canceled = false,
  bonusGranted = false,
  bonusRollsRemaining = 0,
  activePlayerName,
  activePlayerColor,
  onRoll,
  onCommit,
  error,
}: DicePanelProps) {
  const playerColor = PLAYER_COLOR_MAP[activePlayerColor];
  
  // Determine if pre-selection is required
  const activePlayer = gameState.players.find(p => p.id === gameState.turn.activePlayerId);
  const tokensInPlay = activePlayer?.tokens.filter(
    t => t.position.zone === 'board' || t.position.zone === 'home_column'
  ).length ?? 0;
  const requiresPreSelection = tokensInPlay > 1 && !gameState.turn.preSelectedTokenId;
  
  const canRoll = phase === 'AWAITING_ROLL' && !requiresPreSelection;
  const canCommit = phase === 'AWAITING_COMMIT';
  const hasBonusReady = bonusRollsRemaining > 0 && phase === 'AWAITING_ROLL';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--color-surface)',
        border: `2px solid ${hasBonusReady ? 'var(--color-success)' : playerColor}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: hasBonusReady ? '0 0 0 3px rgba(34,197,94,0.2), var(--shadow-md)' : 'var(--shadow-md)',
        minWidth: 220,
        transition: 'border-color var(--motion-state-ms) ease, box-shadow var(--motion-state-ms) ease',
      }}
    >
      {/* Active player indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 'var(--radius-full)',
            backgroundColor: playerColor,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-neutral-700)',
            textAlign: 'center',
          }}
        >
          {getPhaseLabel(phase, activePlayerName, canceled, requiresPreSelection)}
        </span>
      </div>

      {/* Bonus rolls indicator */}
      {hasBonusReady && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-1) var(--space-3)',
            backgroundColor: 'rgba(34,197,94,0.1)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-success)',
          }}
        >
          <span>🎯</span>
          <span>
            {bonusRollsRemaining === 1 ? '1 bonus restant' : `${bonusRollsRemaining} bonus restants`}
          </span>
        </div>
      )}

      {/* Dice face */}
      <div
        aria-label={diceValue ? `Dé : ${diceValue}` : 'Pas encore lancé'}
        style={{
          fontSize: 72,
          lineHeight: 1,
          color: canceled ? 'var(--color-error)' : playerColor,
          opacity: diceValue ? 1 : 0.25,
          transition: 'color var(--motion-state-ms) ease',
          userSelect: 'none',
        }}
      >
        {diceValue ? DICE_FACES[diceValue] : '⚀'}
      </div>

      {/* Bonus indicator (legacy) */}
      {bonusGranted && !canceled && !hasBonusReady && (
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-success)',
            fontWeight: 500,
          }}
        >
          🎯 Bonus accordé !
        </span>
      )}

      {/* Canceled indicator */}
      {canceled && (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', fontWeight: 500 }}>
          ✕ Tour annulé (3×6)
        </span>
      )}

      {/* Action button */}
      {phase !== 'GAME_OVER' && (
        <button
          type="button"
          disabled={!canRoll && !canCommit}
          onClick={canRoll ? onRoll : canCommit ? onCommit : undefined}
          style={{
            padding: 'var(--space-2) var(--space-6)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: canRoll || canCommit ? playerColor : 'var(--color-neutral-200)',
            color: canRoll || canCommit ? '#fff' : 'var(--color-neutral-400)',
            border: 'none',
            cursor: canRoll || canCommit ? 'pointer' : 'default',
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            transition: 'background-color var(--motion-state-ms) ease',
            outline: 'none',
            minWidth: 160,
            boxShadow: hasBonusReady ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
          }}
          onFocus={(e) => {
            if (canRoll || canCommit) {
              (e.currentTarget as HTMLElement).style.outline = '2px solid var(--color-neutral-900)';
              (e.currentTarget as HTMLElement).style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.outline = 'none';
          }}
          aria-label={canRoll ? (hasBonusReady ? 'Lancer le dé (bonus disponible)' : 'Lancer le dé') : canCommit ? 'Confirmer le déplacement' : 'En attente'}
        >
          {canRoll ? (hasBonusReady ? '🎲 Lancer (Bonus)' : '🎲 Lancer') : canCommit ? '✓ Confirmer' : 'En attente…'}
        </button>
      )}

      {/* Error message */}
      {error && (
        <span
          role="alert"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error)',
            textAlign: 'center',
            maxWidth: 200,
          }}
        >
          {error}
        </span>
      )}

      {phase === 'GAME_OVER' && (
        <span
          style={{
            fontSize: 'var(--text-h4)',
            fontWeight: 700,
            color: playerColor,
          }}
        >
          🏆 Partie terminée !
        </span>
      )}
    </div>
  );
}
