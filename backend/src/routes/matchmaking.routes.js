import { Router } from 'express';
import * as matchmakingController from '../controllers/matchmaking.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.post('/join', authMiddleware, matchmakingController.joinQueue);
router.post('/leave', authMiddleware, matchmakingController.leaveQueue);

export default router;
