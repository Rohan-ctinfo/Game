import { db } from '../config/mysql.js';

export async function createMove({ matchId, userId, turnNo, moveNo, actionType, payloadJson, serverTick, isValid = 1 }) {
  await db.execute(
    `INSERT INTO moves (match_id, user_id, turn_no, move_no, action_type, payload_json, server_tick, is_valid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       payload_json = VALUES(payload_json),
       server_tick = VALUES(server_tick),
       is_valid = VALUES(is_valid)`,
    [matchId, userId, turnNo, moveNo, actionType, JSON.stringify(payloadJson), serverTick, isValid]
  );
}
