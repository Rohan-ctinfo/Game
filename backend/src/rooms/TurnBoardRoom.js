import { Room } from '@colyseus/core';
import jwt from 'jsonwebtoken';
import { TurnBoardState } from './schema/TurnBoardState.js';
import { PlayerState } from './schema/PlayerState.js';
import { LudoPlayerState } from './schema/LudoPlayerState.js';
import { LudoTokenState } from './schema/LudoTokenState.js';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { createMove } from '../repositories/move.repository.js';
import { createMatch } from '../repositories/match.repository.js';

const SYMBOLS = {
  LUDO: ['RED', 'GREEN', 'YELLOW', 'BLUE'],
  CARROM: ['WHITE', 'BLACK', 'GREEN', 'YELLOW'],
  POOL_8BALL: ['SOLID', 'STRIPE', 'GREEN', 'YELLOW']
};

const LUDO_START = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 };

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class TurnBoardRoom extends Room {
  async onCreate(options) {
    this.setState(new TurnBoardState());

    this.state.roomCode = options.roomCode;
    this.state.maxPlayers = Number(options.maxPlayers || 2);
    this.state.gameType = options.gameType || 'CARROM';
    this.state.targetScore = this.resolveTargetScore(this.state.gameType);
    this.state.statusMessage = this.resolveStartMessage(this.state.gameType);

    this.setPrivate();
    this.autoDispose = true;

    await redis.set(`room_code:${this.state.roomCode}`, this.roomId, { EX: 3600 });

    this.matchId = await createMatch({
      gameTypeId: Number(options.gameTypeId || 3),
      roomId: Number(options.dbRoomId || 0) || null
    });
    this.moveSeq = 0;

    this.onMessage('roll_dice', async (client) => {
      if (this.state.gameType !== 'LUDO') return;
      try {
        await this.handleLudoDiceRoll(client);
      } catch (err) {
        console.error('roll_dice handler error', err);
        client.send('move_rejected', { reason: 'SERVER_ERROR' });
      }
    });

    this.onMessage('move_token', async (client, payload) => {
      if (this.state.gameType !== 'LUDO') return;
      try {
        await this.handleLudoTokenMove(client, payload);
      } catch (err) {
        console.error('move_token handler error', err);
        client.send('move_rejected', { reason: 'SERVER_ERROR' });
      }
    });

    this.onMessage('move', async (client, payload) => {
      if (this.state.gameType === 'LUDO') return;
      try {
        await this.handleArcadeMove(client, payload);
      } catch (err) {
        console.error('move handler error', err);
        client.send('move_rejected', { reason: 'SERVER_ERROR' });
      }
    });
  }

  async onAuth(client, options) {
    const token = options?.token;
    if (!token) throw new Error('UNAUTHORIZED');
    const payload = jwt.verify(token, env.jwtSecret);
    return { userId: String(payload.sub), username: options.username || `Player-${payload.sub}` };
  }

  async onJoin(client, options, auth) {
    const already = Array.from(this.state.players.values()).find((p) => p.userId === auth.userId);
    if (already) {
      already.connected = true;
      return;
    }

    const symbolList = SYMBOLS[this.state.gameType] || SYMBOLS.CARROM;
    const symbol = symbolList[this.state.players.size] || `P${this.state.players.size + 1}`;

    const player = new PlayerState();
    player.userId = auth.userId;
    player.username = auth.username;
    player.symbol = symbol;
    player.connected = true;

    this.state.players.set(client.sessionId, player);
    this.state.playerOrder.push(client.sessionId);
    this.state.playerScores.set(client.sessionId, 0);

    if (this.state.gameType === 'LUDO') {
      const lp = new LudoPlayerState();
      lp.userId = auth.userId;
      lp.color = symbol;
      lp.startIndex = LUDO_START[symbol] ?? 0;
      for (let i = 0; i < 4; i += 1) {
        const t = new LudoTokenState();
        t.tokenId = i;
        t.progress = -1;
        lp.tokens.push(t);
      }
      this.state.ludoPlayers.set(auth.userId, lp);
    }

    await redis.set(`user:${auth.userId}:presence`, 'in_game', { EX: 60 });

    if (this.state.players.size >= this.state.maxPlayers) {
      this.state.phase = 'ACTIVE';
      const starter = this.getCurrentPlayer();
      this.state.statusMessage = `${starter?.username || 'Player'} turn`;
      this.lock();
      this.broadcast('game_started', {
        roomCode: this.state.roomCode,
        turnIndex: this.state.turnIndex,
        turnNo: this.state.turnNo,
        gameType: this.state.gameType,
        currentTurnUserId: starter?.userId || ''
      });
    }
  }

  async onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.connected = false;
    await redis.set(`user:${player.userId}:presence`, 'offline', { EX: 60 });

    if (this.state.phase === 'ACTIVE' && !consented) {
      const leftSessionId = client.sessionId;
      const leftUserId = player.userId;
      this.allowReconnection(client, 20)
        .then(async (newClient) => {
          await this.handleReconnectSuccess(leftSessionId, newClient, leftUserId);
        })
        .catch(() => {
          this.removePlayer(leftSessionId, leftUserId);
        });
    } else {
      this.removePlayer(client.sessionId, player.userId);
    }
  }

  async onDispose() {
    await redis.del(`room_code:${this.state.roomCode}`);
  }

  removePlayer(sessionId, userId) {
    this.state.players.delete(sessionId);
    this.state.playerScores.delete(sessionId);
    if (this.state.gameType === 'LUDO') this.state.ludoPlayers.delete(userId);
    const next = this.state.playerOrder.filter((id) => id !== sessionId);
    this.state.playerOrder.splice(0, this.state.playerOrder.length);
    for (const id of next) this.state.playerOrder.push(id);
    if (this.state.turnIndex >= this.state.playerOrder.length) this.state.turnIndex = 0;
  }

  replaceSessionInOrder(oldSessionId, newSessionId) {
    for (let i = 0; i < this.state.playerOrder.length; i += 1) {
      if (this.state.playerOrder[i] === oldSessionId) {
        this.state.playerOrder[i] = newSessionId;
      }
    }
  }

  findPlayerByUserId(userId) {
    for (const [sessionId, p] of this.state.players.entries()) {
      if (p.userId === userId) return { sessionId, player: p };
    }
    return null;
  }

  async handleReconnectSuccess(previousSessionId, newClient, userId) {
    const resolved = this.state.players.get(previousSessionId)
      ? { sessionId: previousSessionId, player: this.state.players.get(previousSessionId) }
      : this.findPlayerByUserId(userId);

    if (!resolved) return;

    const oldSessionId = resolved.sessionId;
    const player = resolved.player;
    player.connected = true;

    if (newClient.sessionId !== oldSessionId) {
      const score = this.state.playerScores.get(oldSessionId) || 0;
      this.state.players.delete(oldSessionId);
      this.state.players.set(newClient.sessionId, player);
      this.state.playerScores.delete(oldSessionId);
      this.state.playerScores.set(newClient.sessionId, score);
      this.replaceSessionInOrder(oldSessionId, newClient.sessionId);
    }

    await redis.set(`user:${userId}:presence`, 'in_game', { EX: 60 });
  }

  getCurrentSessionId() {
    return this.state.playerOrder[this.state.turnIndex] || '';
  }

  getCurrentPlayer() {
    return this.state.players.get(this.getCurrentSessionId());
  }

  nextTurn() {
    if (this.state.playerOrder.length === 0) return;
    this.state.turnIndex = (this.state.turnIndex + 1) % this.state.playerOrder.length;
    this.state.turnNo += 1;
    this.state.diceValue = 0;
    this.state.movableTokenIds.splice(0, this.state.movableTokenIds.length);
    const nextPlayer = this.getCurrentPlayer();
    this.state.statusMessage = `${nextPlayer?.username || 'Player'} turn`;
  }

  broadcastTurnChanged() {
    const nextPlayer = this.getCurrentPlayer();
    this.broadcast('turn_changed', {
      turnIndex: this.state.turnIndex,
      turnNo: this.state.turnNo,
      currentTurnUserId: nextPlayer?.userId || ''
    });
  }

  advanceTurnWithDelay(delayMs = 900) {
    this.clock.setTimeout(() => {
      if (this.state.phase !== 'ACTIVE') return;
      this.nextTurn();
      this.broadcastTurnChanged();
    }, delayMs);
  }

  resolveTargetScore(gameType) {
    if (gameType === 'LUDO') return 4;
    if (gameType === 'POOL_8BALL') return 8;
    return 15;
  }

  resolveStartMessage(gameType) {
    if (gameType === 'LUDO') return 'Roll dice and race all 4 tokens home';
    if (gameType === 'POOL_8BALL') return 'Pot balls to reach 8';
    return 'Strike to reach 15 points';
  }

  async handleArcadeMove(client, payload) {
    if (this.state.phase !== 'ACTIVE') return;
    const expectedSessionId = this.getCurrentSessionId();
    if (expectedSessionId !== client.sessionId) {
      client.send('move_rejected', { reason: 'NOT_YOUR_TURN' });
      return;
    }

    const me = this.state.players.get(client.sessionId);
    if (!me) return;

    let result;
    if (this.state.gameType === 'POOL_8BALL') {
      result = this.handlePoolMove(client.sessionId, me, payload);
    } else {
      result = this.handleCarromMove(client.sessionId, me, payload);
    }

    if (!result.ok) {
      client.send('move_rejected', { reason: result.reason || 'INVALID_MOVE' });
      return;
    }

    await createMove({
      matchId: this.matchId,
      userId: Number(me.userId),
      turnNo: this.state.turnNo,
      moveNo: ++this.moveSeq,
      actionType: result.actionType,
      payloadJson: result.payload,
      serverTick: this.clock.currentTime,
      isValid: 1
    });

    const score = this.state.playerScores.get(client.sessionId) || 0;
    if (score >= this.state.targetScore) {
      this.state.phase = 'FINISHED';
      this.state.winnerUserId = me.userId;
      this.state.statusMessage = `${me.username} wins the ${this.state.gameType} match`;
      this.broadcast('game_over', {
        winnerUserId: me.userId,
        winnerName: me.username,
        gameType: this.state.gameType
      });
      this.lock();
      return;
    }

    this.nextTurn();
    this.broadcastTurnChanged();
  }

  async handleLudoDiceRoll(client) {
    if (this.state.phase !== 'ACTIVE') return;
    if (client.sessionId !== this.getCurrentSessionId()) {
      client.send('move_rejected', { reason: 'NOT_YOUR_TURN' });
      return;
    }

    if (this.state.diceValue !== 0) {
      client.send('move_rejected', { reason: 'DICE_ALREADY_ROLLED' });
      return;
    }

    const player = this.state.players.get(client.sessionId);
    const ludoPlayer = this.state.ludoPlayers.get(player.userId);
    const dice = randomInt(1, 6);

    this.state.diceValue = dice;
    ludoPlayer.lastDice = dice;
    ludoPlayer.consecutiveSixes = dice === 6 ? ludoPlayer.consecutiveSixes + 1 : 0;

    if (ludoPlayer.consecutiveSixes >= 3) {
      ludoPlayer.consecutiveSixes = 0;
      this.state.statusMessage = `${player.username} rolled triple six. Turn skipped.`;
      this.state.movableTokenIds.splice(0, this.state.movableTokenIds.length);
      this.advanceTurnWithDelay();
      return;
    }

    const movable = this.getMovableTokens(ludoPlayer, dice);
    this.state.movableTokenIds.splice(0, this.state.movableTokenIds.length);
    for (const id of movable) this.state.movableTokenIds.push(id);

    if (movable.length === 0) {
      this.state.statusMessage = `${player.username} rolled ${dice} and has no valid move.`;
      ludoPlayer.consecutiveSixes = 0;
      this.advanceTurnWithDelay();
      return;
    }

    this.state.statusMessage = `${player.username} rolled ${dice}. Select token.`;
  }

  async handleLudoTokenMove(client, payload) {
    if (this.state.phase !== 'ACTIVE') return;
    if (client.sessionId !== this.getCurrentSessionId()) {
      client.send('move_rejected', { reason: 'NOT_YOUR_TURN' });
      return;
    }

    const dice = this.state.diceValue;
    if (dice <= 0) {
      client.send('move_rejected', { reason: 'ROLL_DICE_FIRST' });
      return;
    }

    const tokenId = Number(payload?.tokenId);
    if (!Number.isInteger(tokenId) || tokenId < 0 || tokenId > 3) {
      client.send('move_rejected', { reason: 'INVALID_TOKEN' });
      return;
    }

    const player = this.state.players.get(client.sessionId);
    const ludoPlayer = this.state.ludoPlayers.get(player.userId);
    const token = ludoPlayer.tokens.find((t) => t.tokenId === tokenId);
    if (!token) {
      client.send('move_rejected', { reason: 'TOKEN_NOT_FOUND' });
      return;
    }

    const movable = this.getMovableTokens(ludoPlayer, dice);
    if (!movable.includes(tokenId)) {
      client.send('move_rejected', { reason: 'MOVE_NOT_ALLOWED' });
      return;
    }

    const prev = token.progress;
    const next = this.computeTargetProgress(token.progress, dice);
    token.progress = next;

    let killed = false;
    if (next < 52) {
      const abs = this.toAbsolutePos(ludoPlayer.startIndex, next);
      killed = this.tryKillOpponents(player.userId, abs);
    }

    if (next === 99) {
      ludoPlayer.finishedCount += 1;
    }

    await createMove({
      matchId: this.matchId,
      userId: Number(player.userId),
      turnNo: this.state.turnNo,
      moveNo: ++this.moveSeq,
      actionType: 'LUDO_MOVE',
      payloadJson: { tokenId, dice, from: prev, to: next, killed },
      serverTick: this.clock.currentTime,
      isValid: 1
    });

    this.state.movableTokenIds.splice(0, this.state.movableTokenIds.length);

    if (ludoPlayer.finishedCount >= 4) {
      this.state.phase = 'FINISHED';
      this.state.winnerUserId = player.userId;
      this.state.statusMessage = `${player.username} wins Ludo`;
      this.broadcast('game_over', {
        winnerUserId: player.userId,
        winnerName: player.username,
        gameType: 'LUDO'
      });
      this.lock();
      return;
    }

    const extraTurn = dice === 6 || killed;
    this.state.diceValue = 0;

    if (extraTurn) {
      this.state.statusMessage = `${player.username} gets extra turn`;
      return;
    }

    ludoPlayer.consecutiveSixes = 0;
    this.nextTurn();
    this.broadcastTurnChanged();
  }

  getMovableTokens(ludoPlayer, dice) {
    const out = [];
    for (const t of ludoPlayer.tokens) {
      if (!this.canMoveToken(ludoPlayer, t, dice)) continue;
      out.push(t.tokenId);
    }
    return out;
  }

  canMoveToken(ludoPlayer, token, dice) {
    const current = token.progress;
    const target = this.computeTargetProgress(current, dice);
    if (target === null) return false;

    if (current >= 0 && current < 52) {
      if (this.isBlockedInPath(ludoPlayer.userId, ludoPlayer.startIndex, current, dice)) return false;
    }

    if (target < 52) {
      const abs = this.toAbsolutePos(ludoPlayer.startIndex, target);
      if (this.isOpponentBlockAt(ludoPlayer.userId, abs)) return false;
    }

    return true;
  }

  computeTargetProgress(current, dice) {
    if (current === -1) return dice === 6 ? 0 : null;
    if (current === 99) return null;

    const total = current + dice;
    if (current >= 0 && current < 52) {
      if (total < 57) return total;
      if (total === 57) return 99;
      return null;
    }

    if (current >= 52 && current <= 57) {
      if (total < 57) return total;
      if (total === 57) return 99;
      return null;
    }

    return null;
  }

  toAbsolutePos(startIndex, progress) {
    return (startIndex + progress) % 52;
  }

  isSafeZone(absPos) {
    return this.state.safeZones.includes(absPos);
  }

  isOpponentBlockAt(userId, absPos) {
    for (const lp of this.state.ludoPlayers.values()) {
      if (lp.userId === userId) continue;
      let count = 0;
      for (const t of lp.tokens) {
        if (t.progress >= 0 && t.progress < 52) {
          const abs = this.toAbsolutePos(lp.startIndex, t.progress);
          if (abs === absPos) count += 1;
        }
      }
      if (count >= 2) return true;
    }
    return false;
  }

  isBlockedInPath(userId, startIndex, fromProgress, dice) {
    const boardSteps = Math.min(dice, Math.max(0, 51 - fromProgress));
    for (let step = 1; step <= boardSteps; step += 1) {
      const abs = this.toAbsolutePos(startIndex, fromProgress + step);
      if (this.isOpponentBlockAt(userId, abs)) return true;
    }
    return false;
  }

  tryKillOpponents(currentUserId, absPos) {
    if (this.isSafeZone(absPos)) return false;
    let killed = false;
    for (const lp of this.state.ludoPlayers.values()) {
      if (lp.userId === currentUserId) continue;
      for (const token of lp.tokens) {
        if (token.progress >= 0 && token.progress < 52) {
          const otherAbs = this.toAbsolutePos(lp.startIndex, token.progress);
          if (otherAbs === absPos) {
            token.progress = -1;
            killed = true;
          }
        }
      }
    }
    return killed;
  }

  handlePoolMove(sessionId, player, payload) {
    const action = String(payload?.action || 'SHOT').toUpperCase();
    if (action !== 'SHOT') return { ok: false, reason: 'INVALID_ACTION' };

    const power = Number(payload?.power ?? 50);
    if (!Number.isFinite(power) || power < 0 || power > 100) return { ok: false, reason: 'INVALID_POWER' };

    const current = this.state.playerScores.get(sessionId) || 0;
    const gain = power >= 70 ? randomInt(1, 2) : randomInt(0, 1);
    const next = Math.min(this.state.targetScore, current + gain);
    this.state.playerScores.set(sessionId, next);
    this.state.statusMessage = `${player.username} potted ${gain} ball(s). Score ${next}/${this.state.targetScore}`;

    return { ok: true, actionType: 'SHOT', payload: { power, potted: gain, from: current, to: next } };
  }

  handleCarromMove(sessionId, player, payload) {
    const action = String(payload?.action || 'STRIKE').toUpperCase();
    if (action !== 'STRIKE') return { ok: false, reason: 'INVALID_ACTION' };

    const power = Number(payload?.power ?? 50);
    if (!Number.isFinite(power) || power < 0 || power > 100) return { ok: false, reason: 'INVALID_POWER' };

    const current = this.state.playerScores.get(sessionId) || 0;
    let gain = power >= 75 ? randomInt(1, 3) : randomInt(0, 2);
    if (randomInt(1, 12) === 1) gain += 1;
    const next = Math.min(this.state.targetScore, current + gain);
    this.state.playerScores.set(sessionId, next);
    this.state.statusMessage = `${player.username} scored ${gain}. Score ${next}/${this.state.targetScore}`;

    return { ok: true, actionType: 'STRIKE', payload: { power, scored: gain, from: current, to: next } };
  }
}
