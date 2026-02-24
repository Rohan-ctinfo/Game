import { Schema, defineTypes, ArraySchema, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState.js';
import { LudoPlayerState } from './LudoPlayerState.js';

export class TurnBoardState extends Schema {
  constructor() {
    super();
    this.roomCode = '';
    this.gameType = 'CARROM';
    this.phase = 'WAITING';
    this.maxPlayers = 2;
    this.turnIndex = 0;
    this.turnNo = 1;
    this.winnerUserId = '';
    this.statusMessage = 'Waiting for players';
    this.targetScore = 0;
    this.diceValue = 0;
    this.board = new ArraySchema('', '', '', '', '', '', '', '', '');
    this.players = new MapSchema();
    this.playerOrder = new ArraySchema();
    this.playerScores = new MapSchema();
    this.ludoPlayers = new MapSchema();
    this.safeZones = new ArraySchema(0, 8, 13, 21, 26, 34, 39, 47);
    this.movableTokenIds = new ArraySchema();
  }
}

defineTypes(TurnBoardState, {
  roomCode: 'string',
  gameType: 'string',
  phase: 'string',
  maxPlayers: 'number',
  turnIndex: 'number',
  turnNo: 'number',
  winnerUserId: 'string',
  statusMessage: 'string',
  targetScore: 'number',
  diceValue: 'number',
  board: ['string'],
  players: { map: PlayerState },
  playerOrder: ['string'],
  playerScores: { map: 'number' },
  ludoPlayers: { map: LudoPlayerState },
  safeZones: ['number'],
  movableTokenIds: ['number']
});
