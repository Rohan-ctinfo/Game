# Realtime Multiplayer Platform (Colyseus + React + MySQL + Redis)

## Stack
- Backend: Node.js, Express, Colyseus, JWT, MySQL (raw queries), Redis
- Frontend: React hooks, Zustand, Colyseus.js, react-hook-form + zod, react-hot-toast

## Core Flow
1. User authenticates (register/login).
2. User A creates room via REST (`POST /api/game/rooms/create`).
3. Backend creates a Colyseus room + 6-char room code.
4. User B joins by code via REST (`POST /api/game/rooms/resolve-code`).
5. Frontend joins Colyseus room by `roomId`.
6. When required players join, game auto-starts and room locks.
7. Moves are validated server-side in room handler (`move`).

## Run
1. Import `backend/database.sql` into MySQL DB `game_platform`.
2. Ensure Redis is running on `127.0.0.1:6379`.
3. Update env files (`backend/.env`, `frontend/.env`).
4. Install deps:
   - `cd backend && npm install`
   - `cd frontend && npm install`
5. Start:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev`

## Implemented UX Improvements
- Signup/login validation and popups
- Auto redirect to dashboard after auth
- Protected routing + navbar + logout
- Create room and join-by-code forms with validation
- Realtime room state from Colyseus schema
- requestAnimationFrame pulse animation on playable cells
