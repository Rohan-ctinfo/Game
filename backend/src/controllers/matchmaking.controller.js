import * as matchmakingService from '../services/matchmaking.service.js';

export async function joinQueue(req, res, next) {
  try {
    const { gameType, elo, region } = req.body;
    const out = await matchmakingService.enqueuePlayer({
      gameType,
      userId: req.user.id,
      elo: Number(elo || 1000),
      region: region || 'global'
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
}

export async function leaveQueue(req, res, next) {
  try {
    const { gameType, region } = req.body;
    const out = await matchmakingService.dequeuePlayer({
      gameType,
      userId: req.user.id,
      region: region || 'global'
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
}
