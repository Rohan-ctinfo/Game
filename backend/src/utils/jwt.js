import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtAccessExpires });
}

export function signRefreshToken(userId, jti) {
  return jwt.sign({ sub: userId, typ: 'refresh', jti }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpires
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
