import { useMemo } from 'react';
import { useGameStore } from '../../store/game.store';

export default function BoardGrid({ onCellClick, myUserId }) {
  const { board, players, turnIndex, phase, pulse } = useGameStore((s) => ({
    board: s.board,
    players: s.players,
    turnIndex: s.turnIndex,
    phase: s.phase,
    pulse: s.pulse
  }));

  const currentTurnPlayer = players[turnIndex];
  const mySymbol = useMemo(() => players.find((p) => Number(p.userId) === Number(myUserId))?.symbol || '', [players, myUserId]);
  const canPlay = phase === 'ACTIVE' && currentTurnPlayer && Number(currentTurnPlayer.userId) === Number(myUserId);

  return (
    <div>
      <div className="board-meta">
        <span>Phase: {phase}</span>
        <span>Turn: {currentTurnPlayer ? `${currentTurnPlayer.username} (${currentTurnPlayer.symbol})` : '-'}</span>
        <span>Your Symbol: {mySymbol || '-'}</span>
      </div>
      <div className="board-grid">
        {board.map((cell, index) => (
          <button
            key={index}
            className="cell"
            onClick={() => onCellClick(index)}
            disabled={!canPlay || !!cell}
            style={{
              boxShadow: canPlay && !cell ? `0 0 ${8 + pulse * 14}px rgba(0, 153, 255, 0.65)` : 'none'
            }}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}
