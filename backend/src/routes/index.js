import { Router } from 'express';
import authRoutes from './auth.routes.js';
import gameRoutes from './game.routes.js';
import matchmakingRoutes from './matchmaking.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/game', gameRoutes);
router.use('/matchmaking', matchmakingRoutes);

export default router;
