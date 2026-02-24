import { db } from '../config/mysql.js';

export async function findUserByEmail(email) {
  const [rows] = await db.execute(
    'SELECT id, username, email, password_hash FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

export async function findUserByUsernameOrEmail(username, email) {
  const [rows] = await db.execute(
    'SELECT id FROM users WHERE (username = ? OR email = ?) AND deleted_at IS NULL LIMIT 1',
    [username, email]
  );
  return rows[0] || null;
}

export async function createUser({ username, email, passwordHash }) {
  const [res] = await db.execute(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username, email, passwordHash]
  );
  return res.insertId;
}
