import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/game.store';
import LudoBoard from './LudoBoard';

export default function GameArena({ onPlayAction, onRollDice, myUserId }) {
  const [power, setPower] = useState(60);
  const {
    gameType,
    phase,
    players,
    turnIndex,
    statusMessage,
    pulse,
    diceValue,
    movableTokenIds,
    ludoPlayers
  } = useGameStore((s) => ({
    gameType: s.gameType,
    phase: s.phase,
    players: s.players,
    turnIndex: s.turnIndex,
    statusMessage: s.statusMessage,
    pulse: s.pulse,
    diceValue: s.diceValue,
    movableTokenIds: s.movableTokenIds,
    ludoPlayers: s.ludoPlayers
  }));

  const currentTurn = players[turnIndex];
  const canPlay = phase === 'ACTIVE' && Number(currentTurn?.userId || 0) === Number(myUserId);

  const actionLabel = useMemo(() => {
    if (gameType === 'POOL_8BALL') return 'Take Shot';
    if (gameType === 'CARROM') return 'Strike';
    return 'Play';
  }, [gameType]);

  const submitAction = () => {
    if (!canPlay) return;
    if (gameType === 'POOL_8BALL') {
      onPlayAction({ action: 'SHOT', power });
      return;
    }
    if (gameType === 'CARROM') {
      onPlayAction({ action: 'STRIKE', power });
    }
  };

  const canRoll = gameType === 'LUDO' && canPlay && diceValue === 0;
  const canSelectTokens = gameType === 'LUDO' && canPlay && diceValue > 0 && movableTokenIds.length > 0;

  return (
    <section className="panel arena">
      <h2>{gameType.replace('_', ' ')}</h2>
      <p className="status-line">{statusMessage}</p>

      <div className="turn-box" style={{ boxShadow: canPlay ? `0 0 ${10 + pulse * 16}px rgba(18,115,234,0.4)` : 'none' }}>
        <span>Current Turn</span>
        <strong>{currentTurn ? currentTurn.username : '-'}</strong>
      </div>

      {gameType === 'LUDO' ? (
        <>
          <div className="dice-row">
            <button onClick={onRollDice} disabled={!canRoll}>Roll Dice</button>
            <div className="dice-face">{diceValue || '-'}</div>
          </div>
          <LudoBoard
            ludoPlayers={ludoPlayers}
            movableTokenIds={movableTokenIds}
            canSelectTokens={canSelectTokens}
            myUserId={myUserId}
            onTokenClick={(tokenId) => onPlayAction({ tokenId })}
          />
          {canSelectTokens ? <small>Select a highlighted token.</small> : null}
        </>
      ) : (
        <>
          <div className="power-box">
            <label>Power: {power}</label>
            <input type="range" min={0} max={100} value={power} onChange={(e) => setPower(Number(e.target.value))} disabled={!canPlay} />
          </div>
          <button onClick={submitAction} disabled={!canPlay}>{actionLabel}</button>
        </>
      )}

      {!canPlay && phase === 'ACTIVE' && <small>Wait for your turn.</small>}
    </section>
  );
}
