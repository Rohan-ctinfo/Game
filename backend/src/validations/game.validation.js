import { z } from 'zod';

export const createRoomSchema = z.object({
  gameType: z.enum(['LUDO', 'POOL_8BALL', 'CARROM']).default('CARROM'),
  maxPlayers: z.number().int().min(2).max(4).default(2)
});

export const resolveRoomSchema = z.object({
  roomCode: z.string().trim().min(6).max(6)
});
