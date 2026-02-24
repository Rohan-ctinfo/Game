import { Schema, defineTypes, ArraySchema } from '@colyseus/schema';
import { LudoTokenState } from './LudoTokenState.js';

export class LudoPlayerState extends Schema {
  constructor() {
    super();
    this.userId = '';
    this.color = 'RED';
    this.startIndex = 0;
    this.finishedCount = 0;
    this.consecutiveSixes = 0;
    this.lastDice = 0;
    this.tokens = new ArraySchema();
  }
}

defineTypes(LudoPlayerState, {
  userId: 'string',
  color: 'string',
  startIndex: 'number',
  finishedCount: 'number',
  consecutiveSixes: 'number',
  lastDice: 'number',
  tokens: [LudoTokenState]
});
