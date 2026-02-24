import { useMemo } from 'react';
import { useGameStore } from '../../store/game.store';

export default function PlayerSidebar({ myUserId }) {
  const { players, playerScores, turnIndex, targetScore, phase, gameType, ludoPlayers } = useGameStore((s) => ({
    players: s.players,
    playerScores: s.playerScores,
    turnIndex: s.turnIndex,
    targetScore: s.targetScore,
    phase: s.phase,
    gameType: s.gameType,
    ludoPlayers: s.ludoPlayers
  }));

  const currentTurnUserId = useMemo(() => players[turnIndex]?.userId || '', [players, turnIndex]);

  return (
    <aside className="panel sidebar">
      <h3>Players</h3>
      {players.map((player, idx) => {
        const ludo = ludoPlayers.find((lp) => Number(lp.userId) === Number(player.userId));
        const score = gameType === 'LUDO'
          ? Number(ludo?.finishedCount || 0)
          : Number(playerScores[player.sessionId] || 0);
        const maxScore = gameType === 'LUDO' ? 4 : targetScore;
        const isTurn = Number(player.userId) === Number(currentTurnUserId) && phase === 'ACTIVE';
        const isMe = Number(player.userId) === Number(myUserId);
        const progress = maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0;

        return (
          <div key={player.sessionId} className={`player-card ${isTurn ? 'active-turn' : ''}`}>
            <div className="player-head">
              <strong>{player.username}{isMe ? ' (You)' : ''}</strong>
              <span>{player.symbol}</span>
            </div>
            <div className="score-row">
              <span>{score}/{maxScore}</span>
              <span>{player.connected ? 'Online' : 'Offline'}</span>
            </div>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {isTurn && <small className="turn-badge">Current Turn</small>}
          </div>
        );
      })}
    </aside>
  );
}
