import http from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import app from './app.js';
import { env } from './config/env.js';
import { connectRedis } from './config/redis.js';
import { TurnBoardRoom } from './rooms/TurnBoardRoom.js';

async function bootstrap() {
  await connectRedis();

  const httpServer = http.createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer })
  });

  gameServer.define('turn_board', TurnBoardRoom).filterBy(['roomCode']);

  httpServer.listen(env.port, () => {
    console.log(`API+Colyseus running on :${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
