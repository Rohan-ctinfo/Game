import { apiRequest } from './client';

export function createRoom(payload) {
  return apiRequest('/game/rooms/create', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function resolveRoomCode(payload) {
  return apiRequest('/game/rooms/resolve-code', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function joinQueue(payload) {
  return apiRequest('/matchmaking/join', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
