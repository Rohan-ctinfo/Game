import * as gameRoomService from '../services/gameRoom.service.js';
import { createRoomSchema, resolveRoomSchema } from '../validations/game.validation.js';

export async function createRoom(req, res, next) {
  try {
    const data = createRoomSchema.parse(req.body);
    const room = await gameRoomService.createGameRoom({
      gameType: data.gameType,
      maxPlayers: data.maxPlayers,
      hostUserId: req.user.id
    });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

export async function resolveRoomCode(req, res, next) {
  try {
    const data = resolveRoomSchema.parse(req.body);
    const out = await gameRoomService.resolveRoomCode(data);
    res.json(out);
  } catch (err) {
    next(err);
  }
}
