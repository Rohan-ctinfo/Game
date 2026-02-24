import { verifyAccessToken } from '../utils/jwt.js';

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub) };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
