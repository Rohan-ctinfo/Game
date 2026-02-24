import { v4 as uuidv4 } from 'uuid';
import { matchMaker } from '@colyseus/core';
import { redis } from '../config/redis.js';
import * as gameRoomRepo from '../repositories/gameRoom.repository.js';

function generateRoomCode() {
  return uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
}

export async function createGameRoom({ gameType, maxPlayers, hostUserId }) {
  const gameTypeRow = await gameRoomRepo.findGameTypeByCode(gameType);
  if (!gameTypeRow) {
    const err = new Error('Invalid game type');
    err.status = 400;
    throw err;
  }

  const roomCode = generateRoomCode();
  const dbRoomId = await gameRoomRepo.createRoom({
    roomCode,
    gameTypeId: gameTypeRow.id,
    hostUserId,
    maxPlayers,
    settingsJson: { authoritative: true, framework: 'colyseus' }
  });

  const room = await matchMaker.createRoom('turn_board', {
    roomCode,
    maxPlayers,
    dbRoomId,
    gameType,
    gameTypeId: gameTypeRow.id
  });

  await redis.set(`room_code:${roomCode}`, room.roomId, { EX: 3600 });

  return { roomId: room.roomId, roomCode, maxPlayers, gameType };
}

export async function resolveRoomCode({ roomCode }) {
  const normalized = String(roomCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    const err = new Error('Invalid room code');
    err.status = 400;
    throw err;
  }

  const roomId = await redis.get(`room_code:${normalized}`);
  if (!roomId) {
    const err = new Error('Room not found or expired');
    err.status = 404;
    throw err;
  }

  return { roomId, roomCode: normalized };
}
