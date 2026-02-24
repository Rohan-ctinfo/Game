import { db } from '../config/mysql.js';

export async function createSession({ userId, refreshTokenHash, jti, ipAddress, userAgent, expiresAt }) {
  await db.execute(
    `INSERT INTO sessions (user_id, refresh_token_hash, jwt_jti, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, INET6_ATON(?), ?, ?)`,
    [userId, refreshTokenHash, jti, ipAddress || null, userAgent || null, expiresAt]
  );
}
