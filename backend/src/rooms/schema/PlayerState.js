import { Schema, defineTypes } from '@colyseus/schema';

export class PlayerState extends Schema {
  constructor() {
    super();
    this.userId = '';
    this.username = '';
    this.symbol = '';
    this.connected = true;
  }
}

defineTypes(PlayerState, {
  userId: 'string',
  username: 'string',
  symbol: 'string',
  connected: 'boolean'
});
