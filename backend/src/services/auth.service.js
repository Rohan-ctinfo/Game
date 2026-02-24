import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import * as userRepo from '../repositories/user.repository.js';
import * as sessionRepo from '../repositories/session.repository.js';

export async function register({ username, email, password, ipAddress, userAgent }) {
  const existing = await userRepo.findUserByUsernameOrEmail(username, email);
  if (existing) {
    const err = new Error('User already exists');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = await userRepo.createUser({ username, email, passwordHash });
  return issueSessionTokens({ userId, username, ipAddress, userAgent });
}

export async function login({ email, password, ipAddress, userAgent }) {
  const user = await userRepo.findUserByEmail(email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  return issueSessionTokens({ userId: user.id, username: user.username, ipAddress, userAgent });
}

async function issueSessionTokens({ userId, username, ipAddress, userAgent }) {
  const jti = uuidv4();
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId, jti);

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await sessionRepo.createSession({
    userId,
    refreshTokenHash,
    jti,
    ipAddress,
    userAgent,
    expiresAt
  });

  return { userId, username, accessToken, refreshToken };
}
