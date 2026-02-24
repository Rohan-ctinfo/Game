import { Schema, defineTypes } from '@colyseus/schema';

export class LudoTokenState extends Schema {
  constructor() {
    super();
    this.tokenId = 0;
    this.progress = -1; // -1 base, 0-51 board, 52-57 home path, 99 finished
  }
}

defineTypes(LudoTokenState, {
  tokenId: 'number',
  progress: 'number'
});
