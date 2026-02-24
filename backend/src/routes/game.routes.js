import { Router } from 'express';
import * as gameController from '../controllers/game.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.post('/rooms/create', authMiddleware, gameController.createRoom);
router.post('/rooms/resolve-code', authMiddleware, gameController.resolveRoomCode);

export default router;
