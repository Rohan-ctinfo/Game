import { db } from '../config/mysql.js';

export async function findGameTypeByCode(code) {
  const [rows] = await db.execute('SELECT id, code FROM game_types WHERE code = ? AND is_enabled = 1 LIMIT 1', [code]);
  return rows[0] || null;
}

export async function createRoom({ roomCode, gameTypeId, hostUserId, maxPlayers, settingsJson }) {
  const [res] = await db.execute(
    `INSERT INTO game_rooms (room_code, game_type_id, host_user_id, max_players, settings_json)
     VALUES (?, ?, ?, ?, ?)`,
    [roomCode, gameTypeId, hostUserId, maxPlayers, JSON.stringify(settingsJson || {})]
  );
  return res.insertId;
}

export async function findRoomByCode(roomCode) {
  const [rows] = await db.execute(
    `SELECT id, room_code, status FROM game_rooms WHERE room_code = ? AND deleted_at IS NULL LIMIT 1`,
    [roomCode]
  );
  return rows[0] || null;
}
