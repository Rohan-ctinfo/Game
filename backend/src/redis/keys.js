export function redisKeyGameState(roomId) {
  return `game:${roomId}:state`;
}

export function redisKeyPresence(userId) {
  return `user:${userId}:presence`;
}

export function redisKeyMatchmaking(gameType, region = 'global') {
  return `matchmaking:${gameType}:${region}`;
}
