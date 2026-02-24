import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createRoom, resolveRoomCode } from '../../services/api/game.api';
import { useGameStore } from '../../store/game.store';

const createSchema = z.object({
  gameType: z.enum(['CARROM', 'LUDO', 'POOL_8BALL']),
  maxPlayers: z.coerce.number().int().min(2).max(4)
});

const joinSchema = z.object({
  roomCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, 'Enter 6-character room code')
});

export default function DashboardPage() {
  const nav = useNavigate();
  const setRoomMeta = useGameStore((s) => s.setRoomMeta);

  const createForm = useForm({ resolver: zodResolver(createSchema), defaultValues: { gameType: 'CARROM', maxPlayers: 2 } });
  const joinForm = useForm({ resolver: zodResolver(joinSchema), defaultValues: { roomCode: '' } });

  const onCreate = async (values) => {
    try {
      const room = await createRoom(values);
      setRoomMeta({ roomId: room.roomId, roomCode: room.roomCode });
      toast.success(`Room created: ${room.roomCode}`);
      nav(`/game/${room.roomId}`, { state: { roomCode: room.roomCode } });
    } catch (err) {
      toast.error(err.message || 'Failed to create room');
    }
  };

  const onJoin = async (values) => {
    try {
      const resolved = await resolveRoomCode({ roomCode: values.roomCode.toUpperCase() });
      setRoomMeta({ roomId: resolved.roomId, roomCode: resolved.roomCode });
      toast.success(`Joining room ${resolved.roomCode}`);
      nav(`/game/${resolved.roomId}`, { state: { roomCode: resolved.roomCode } });
    } catch (err) {
      toast.error(err.message || 'Unable to join room');
    }
  };

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <h2>Create Game</h2>
        <form onSubmit={createForm.handleSubmit(onCreate)}>
          <label>Game Type</label>
          <select {...createForm.register('gameType')}>
            <option value="CARROM">Carrom</option>
            <option value="LUDO">Ludo</option>
            <option value="POOL_8BALL">Pool</option>
          </select>

          <label>Max Players</label>
          <select {...createForm.register('maxPlayers')}>
            <option value={2}>2 Players</option>
            <option value={4}>4 Players</option>
          </select>

          <button type="submit" disabled={createForm.formState.isSubmitting}>Create Room</button>
        </form>
      </section>

      <section className="panel">
        <h2>Join By Code</h2>
        <form onSubmit={joinForm.handleSubmit(onJoin)}>
          <label>Room Code</label>
          <input placeholder="X7K9LP" {...joinForm.register('roomCode')} />
          {joinForm.formState.errors.roomCode && <small className="error">{joinForm.formState.errors.roomCode.message}</small>}
          <button type="submit" disabled={joinForm.formState.isSubmitting}>Join Room</button>
        </form>
      </section>
    </div>
  );
}
