import { Client } from 'colyseus.js';
import { COLYSEUS_URL } from '../../constants/config';

export const colyseusClient = new Client(COLYSEUS_URL);

function reconnectKey(roomId) {
  return `colyseus:reconnect:${roomId}`;
}

export function clearReconnectToken(roomId) {
  localStorage.removeItem(reconnectKey(roomId));
}

export async function joinRoomById({ roomId, token, username }) {
  const key = reconnectKey(roomId);
  const storedToken = localStorage.getItem(key);

  if (storedToken) {
    try {
      const rejoined = await colyseusClient.reconnect(storedToken);
      localStorage.setItem(key, rejoined.reconnectionToken);
      return rejoined;
    } catch {
      localStorage.removeItem(key);
    }
  }

  const joined = await colyseusClient.joinById(roomId, { token, username });
  localStorage.setItem(key, joined.reconnectionToken);
  return joined;
}
