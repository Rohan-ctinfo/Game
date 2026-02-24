import { db } from '../config/mysql.js';

export async function createMatch({ gameTypeId, roomId }) {
  const [res] = await db.execute(
    `INSERT INTO matches (game_type_id, room_id, status, started_at)
     VALUES (?, ?, 'ONGOING', UTC_TIMESTAMP())`,
    [gameTypeId, roomId]
  );
  return res.insertId;
}

export async function finishMatch({ matchId, winnerUserId }) {
  await db.execute(
    `UPDATE matches
     SET status = 'COMPLETED', winner_user_id = ?, ended_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [winnerUserId || null, matchId]
  );
}
