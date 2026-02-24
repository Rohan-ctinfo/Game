import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import GameArena from '../../components/game/GameArena';
import PlayerSidebar from '../../components/game/PlayerSidebar';
import { clearReconnectToken, joinRoomById } from '../../services/socket/colyseusClient';
import { useAuthStore } from '../../store/auth.store';
import { useGameStore } from '../../store/game.store';
import { useRafPulse } from '../../hooks/useRafPulse';

function toPlainPlayers(playersMap, playerOrder) {
  const bySession = {};
  playersMap.forEach((p, sessionId) => {
    bySession[sessionId] = {
      sessionId,
      userId: p.userId,
      username: p.username,
      symbol: p.symbol,
      connected: p.connected
    };
  });

  const ordered = [];
  for (const sessionId of playerOrder) {
    if (bySession[sessionId]) ordered.push(bySession[sessionId]);
  }
  return ordered;
}

function toPlainScores(scoreMap) {
  const scores = {};
  scoreMap.forEach((score, sessionId) => {
    scores[sessionId] = Number(score);
  });
  return scores;
}

function toPlainLudoPlayers(ludoMap) {
  const out = [];
  ludoMap.forEach((lp) => {
    out.push({
      userId: lp.userId,
      color: lp.color,
      startIndex: lp.startIndex,
      finishedCount: lp.finishedCount,
      consecutiveSixes: lp.consecutiveSixes,
      lastDice: lp.lastDice,
      tokens: lp.tokens.map((t) => ({ tokenId: t.tokenId, progress: t.progress }))
    });
  });
  return out;
}

export default function GamePage() {
  const { roomId } = useParams();
  const location = useLocation();
  const nav = useNavigate();

  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const token = useAuthStore((s) => s.accessToken);

  const {
    roomCode,
    setRoomMeta,
    setRoom,
    setStateSnapshot,
    reset,
    room,
    phase,
    winnerUserId,
    gameType,
    statusMessage
  } = useGameStore((s) => ({
    roomCode: s.roomCode,
    setRoomMeta: s.setRoomMeta,
    setRoom: s.setRoom,
    setStateSnapshot: s.setStateSnapshot,
    reset: s.reset,
    room: s.room,
    phase: s.phase,
    winnerUserId: s.winnerUserId,
    gameType: s.gameType,
    statusMessage: s.statusMessage
  }));

  const [joining, setJoining] = useState(true);
  useRafPulse(phase === 'ACTIVE');

  useEffect(() => {
    let mounted = true;
    let activeRoom;
    let pageUnloading = false;

    const onBeforeUnload = () => {
      pageUnloading = true;
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const connect = async () => {
      try {
        setJoining(true);
        if (location.state?.roomCode) {
          setRoomMeta({ roomId, roomCode: location.state.roomCode });
        }

        const joined = await joinRoomById({
          roomId,
          token,
          username: username || `Player-${userId}`
        });

        if (!mounted) {
          joined.leave();
          return;
        }

        activeRoom = joined;
        setRoom(joined);

        joined.onStateChange((state) => {
          const snapshot = {
            gameType: state.gameType,
            phase: state.phase,
            turnIndex: state.turnIndex,
            turnNo: state.turnNo,
            winnerUserId: state.winnerUserId,
            statusMessage: state.statusMessage,
            targetScore: state.targetScore,
            diceValue: state.diceValue,
            safeZones: [...state.safeZones],
            movableTokenIds: [...state.movableTokenIds],
            players: toPlainPlayers(state.players, state.playerOrder),
            playerScores: toPlainScores(state.playerScores),
            ludoPlayers: toPlainLudoPlayers(state.ludoPlayers)
          };
          setStateSnapshot(snapshot);
        });

        joined.onMessage('move_rejected', (payload) => {
          toast.error(payload.reason || 'Move rejected');
        });

        joined.onMessage('game_started', (payload) => {
          toast.success(`${payload.gameType} game started`);
        });

        joined.onMessage('game_over', (payload) => {
          if (payload.draw) toast('Game finished: draw');
          else toast.success(`Winner: ${payload.winnerName || payload.winnerUserId}`);
        });

        setJoining(false);
      } catch (err) {
        if (String(err?.message || '').toLowerCase().includes('locked')) {
          clearReconnectToken(roomId);
        }
        toast.error(err.message || 'Unable to join room');
        nav('/dashboard', { replace: true });
      }
    };

    connect();

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (activeRoom && !pageUnloading) activeRoom.leave();
      reset();
    };
  }, [location.state?.roomCode, nav, reset, roomId, setRoom, setRoomMeta, setStateSnapshot, token, userId, username]);

  const statusText = useMemo(() => {
    if (joining) return 'Joining room...';
    if (phase === 'WAITING') return 'Waiting for required players';
    if (phase === 'ACTIVE') return statusMessage;
    return winnerUserId ? `Finished. Winner: ${winnerUserId}` : 'Finished';
  }, [joining, phase, statusMessage, winnerUserId]);

  const onPlayAction = (payload) => {
    if (!room) return;
    if (gameType === 'LUDO') {
      room.send('move_token', payload);
      return;
    }
    room.send('move', payload);
  };

  const onRollDice = () => {
    if (!room || gameType !== 'LUDO') return;
    room.send('roll_dice');
  };

  return (
    <div className="game-layout">
      <GameArena onPlayAction={onPlayAction} onRollDice={onRollDice} myUserId={userId} />
      <PlayerSidebar myUserId={userId} />
      <div className="panel game-foot">
        <strong>Room:</strong> {roomCode || '------'}
        <span> | </span>
        <strong>Mode:</strong> {gameType}
        <span> | </span>
        <strong>Status:</strong> {statusText}
      </div>
    </div>
  );
}
