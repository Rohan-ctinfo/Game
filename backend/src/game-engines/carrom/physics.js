const BOARD_LIMIT = 1;
const FRICTION = 0.985;

export function applyStrike(state, payload) {
  const angle = Number(payload.angle);
  const power = Number(payload.power);

  if (!Number.isFinite(angle) || !Number.isFinite(power)) return false;
  if (power < 0 || power > 1) return false;

  const speed = power * 2.3;
  state.striker.vx = Math.cos(angle) * speed;
  state.striker.vy = Math.sin(angle) * speed;
  state.moveNo += 1;
  state.seq += 1;
  state.lastUpdatedAt = Date.now();
  return true;
}

export function tickCarrom(state, dt = 1 / 60) {
  const bodies = [state.striker, ...state.coins];

  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    b.vx *= FRICTION;
    b.vy *= FRICTION;

    if (Math.abs(b.vx) < 0.0005) b.vx = 0;
    if (Math.abs(b.vy) < 0.0005) b.vy = 0;

    if (b.x < -BOARD_LIMIT || b.x > BOARD_LIMIT) {
      b.vx *= -0.95;
      b.x = Math.max(-BOARD_LIMIT, Math.min(BOARD_LIMIT, b.x));
    }
    if (b.y < -BOARD_LIMIT || b.y > BOARD_LIMIT) {
      b.vy *= -0.95;
      b.y = Math.max(-BOARD_LIMIT, Math.min(BOARD_LIMIT, b.y));
    }
  }

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      resolveCollision(bodies[i], bodies[j]);
    }
  }

  state.seq += 1;
  state.lastUpdatedAt = Date.now();
}

function resolveCollision(a, b) {
  const ar = a.r || 0.05;
  const br = b.r || 0.045;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const minDist = ar + br;

  if (distSq === 0 || distSq > minDist * minDist) return;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return;

  const restitution = 0.9;
  const impulse = -(1 + restitution) * velAlongNormal / 2;

  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
}
