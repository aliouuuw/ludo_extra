'use client';

import { useGameState } from '../src/hooks/useGameState';
import { Board } from '../src/components/composites/Board';
import { DicePanel } from '../src/components/composites/DicePanel';
import '../src/styles/tokens.css';

export default function Home() {
  const {
    gameState,
    pendingAnimation,
    rollDice,
    selectToken,
    deselectToken,
    commitMove,
    resetGame,
    onAnimationComplete,
    error,
  } = useGameState();

  const { turn, players, moveLog, status } = gameState;
  const activePlayer = players.find((p) => p.id === turn.activePlayerId);

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-neutral-100)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-4)',
        gap: 'var(--space-4)',
        fontFamily: 'Geist, sans-serif',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 900 }}>
        <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--color-neutral-900)', margin: 0 }}>
          Ludo Extra
        </h1>
        <button
          type="button"
          onClick={resetGame}
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            cursor: 'pointer',
            color: 'var(--color-neutral-700)',
          }}
        >
          Nouvelle partie
        </button>
      </header>

      {/* Main layout: board + panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 'var(--space-6)',
          width: '100%',
          maxWidth: 900,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {/* Board */}
        <div style={{ flex: '1 1 400px', minWidth: 0 }}>
          <Board
            gameState={gameState}
            onTokenSelect={selectToken}
            onTokenDeselect={deselectToken}
            pendingAnimation={pendingAnimation}
            onAnimationComplete={onAnimationComplete}
          />
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 220 }}>
          {activePlayer && (
            <DicePanel
              phase={turn.phase}
              diceValue={turn.diceResult?.value ?? null}
              canceled={turn.diceResult?.canceled}
              bonusGranted={turn.diceResult?.bonusGranted}
              bonusRollsRemaining={turn.bonusRollsRemaining}
              activePlayerName={activePlayer.name}
              activePlayerColor={activePlayer.color}
              onRoll={rollDice}
              onCommit={commitMove}
              error={error}
            />
          )}

          {/* Standings */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-neutral-600)' }}>
              Joueurs
            </span>
            {players.map((p) => {
              const tokensHome = p.tokens.filter((t) => t.position.zone === 'home').length;
              const isActive = p.id === turn.activePlayerId && status === 'active';
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: `var(--color-player-${p.color})`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 400, flex: 1, color: 'var(--color-neutral-800)' }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-neutral-500)' }}>
                    {p.placement ? `#${p.placement}` : `${tokensHome}/4 🏠`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Move log (last 6 entries) */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 'var(--space-1)' }}>
              Historique
            </span>
            {moveLog.length === 0 && (
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-neutral-400)' }}>
                Aucun coup joué
              </span>
            )}
            {[...moveLog].reverse().slice(0, 10).map((entry, i) => {
              const player = players.find((p) => p.id === entry.playerId);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: `var(--color-player-${player?.color ?? 'red'})`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-neutral-600)' }}>
                    {player?.name} — {entry.dice.value} — {entry.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
