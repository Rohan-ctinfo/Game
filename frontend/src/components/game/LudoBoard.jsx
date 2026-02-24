import { useEffect, useMemo, useRef, useState } from 'react';

const BOARD_SIZE = 600;
const CELL = BOARD_SIZE / 15;

const COLOR_HEX = {
  RED: '#e53935',
  GREEN: '#43a047',
  YELLOW: '#fdd835',
  BLUE: '#1e88e5'
};

const SAFE_ABS = [0, 8, 13, 21, 26, 34, 39, 47];

const PATH_CELLS = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
];

const HOME_CELLS = {
  RED: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  GREEN: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  YELLOW: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  BLUE: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]]
};

const BASE_SLOTS = {
  RED: [[2, 2], [4, 2], [2, 4], [4, 4]],
  GREEN: [[10, 2], [12, 2], [10, 4], [12, 4]],
  BLUE: [[2, 10], [4, 10], [2, 12], [4, 12]],
  YELLOW: [[10, 10], [12, 10], [10, 12], [12, 12]]
};

function centerPoint(col, row) {
  return { x: (col + 0.5) * CELL, y: (row + 0.5) * CELL };
}

function visualPathIndex(absPos) {
  return (52 - (absPos % 52)) % 52;
}

function tokenTarget(player, token, absPosFn) {
  const p = token.progress;
  if (p === -1) {
    const [c, r] = (BASE_SLOTS[player.color] || BASE_SLOTS.RED)[token.tokenId] || [2, 2];
    return centerPoint(c, r);
  }
  if (p === 99) return centerPoint(7, 7);
  if (p >= 52) {
    const idx = Math.max(0, Math.min(5, p - 52));
    const [c, r] = (HOME_CELLS[player.color] || HOME_CELLS.RED)[idx];
    return centerPoint(c, r);
  }
  const abs = absPosFn(player.startIndex, p);
  const [c, r] = PATH_CELLS[visualPathIndex(abs)] || [7, 7];
  return centerPoint(c, r);
}

function renderGridCells() {
  const cells = [];
  for (let r = 0; r < 15; r += 1) {
    for (let c = 0; c < 15; c += 1) {
      cells.push(
        <rect
          key={`grid-${c}-${r}`}
          x={c * CELL}
          y={r * CELL}
          width={CELL}
          height={CELL}
          fill="#ffffff"
          stroke="#111"
          strokeWidth="0.8"
        />
      );
    }
  }
  return cells;
}

function renderColorPath() {
  const colorCells = [
    ...[[7,1],[7,2],[7,3],[7,4],[7,5]].map(([c,r]) => ({ c, r, color: '#e53935' })),
    ...[[9,7],[10,7],[11,7],[12,7],[13,7]].map(([c,r]) => ({ c, r, color: '#43a047' })),
    ...[[7,9],[7,10],[7,11],[7,12],[7,13]].map(([c,r]) => ({ c, r, color: '#fdd835' })),
    ...[[1,7],[2,7],[3,7],[4,7],[5,7]].map(([c,r]) => ({ c, r, color: '#1e88e5' }))
  ];

  return colorCells.map((cell, idx) => (
    <rect
      key={`path-${idx}`}
      x={cell.c * CELL}
      y={cell.r * CELL}
      width={CELL}
      height={CELL}
      fill={cell.color}
      stroke="#111"
      strokeWidth="0.8"
    />
  ));
}

export default function LudoBoard({ ludoPlayers, movableTokenIds, onTokenClick, canSelectTokens, myUserId }) {
  const [display, setDisplay] = useState({});
  const targetsRef = useRef({});

  const allTokens = useMemo(() => {
    const list = [];
    for (const player of ludoPlayers) {
      for (const token of player.tokens) {
        list.push({
          key: `${player.userId}_${token.tokenId}`,
          player,
          token,
          color: COLOR_HEX[player.color] || '#111827'
        });
      }
    }
    return list;
  }, [ludoPlayers]);

  useEffect(() => {
    const nextTargets = {};
    for (const row of allTokens) {
      nextTargets[row.key] = tokenTarget(row.player, row.token, (start, progress) => (start + progress) % 52);
    }
    targetsRef.current = nextTargets;

    setDisplay((prev) => {
      const seed = { ...prev };
      for (const key of Object.keys(nextTargets)) {
        if (!seed[key]) seed[key] = { ...nextTargets[key] };
      }
      return seed;
    });
  }, [allTokens]);

  useEffect(() => {
    let raf;
    const tick = () => {
      setDisplay((prev) => {
        const out = { ...prev };
        for (const [key, target] of Object.entries(targetsRef.current)) {
          const curr = out[key] || target;
          out[key] = {
            x: curr.x + (target.x - curr.x) * 0.28,
            y: curr.y + (target.y - curr.y) * 0.28
          };
        }
        return out;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="ludo-board">
      <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="ludo-svg">
        {renderGridCells()}

        <rect x={0} y={0} width={6 * CELL} height={6 * CELL} fill="#e53935" />
        <rect x={9 * CELL} y={0} width={6 * CELL} height={6 * CELL} fill="#43a047" />
        <rect x={0} y={9 * CELL} width={6 * CELL} height={6 * CELL} fill="#1e88e5" />
        <rect x={9 * CELL} y={9 * CELL} width={6 * CELL} height={6 * CELL} fill="#fdd835" />

        <rect x={CELL} y={CELL} width={4 * CELL} height={4 * CELL} fill="#fff" stroke="#111" strokeWidth="0.8" />
        <rect x={10 * CELL} y={CELL} width={4 * CELL} height={4 * CELL} fill="#fff" stroke="#111" strokeWidth="0.8" />
        <rect x={CELL} y={10 * CELL} width={4 * CELL} height={4 * CELL} fill="#fff" stroke="#111" strokeWidth="0.8" />
        <rect x={10 * CELL} y={10 * CELL} width={4 * CELL} height={4 * CELL} fill="#fff" stroke="#111" strokeWidth="0.8" />

        {renderColorPath()}

        <polygon points={`${6*CELL},${6*CELL} ${9*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`} fill="#e53935" />
        <polygon points={`${9*CELL},${6*CELL} ${9*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`} fill="#43a047" />
        <polygon points={`${6*CELL},${9*CELL} ${9*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`} fill="#fdd835" />
        <polygon points={`${6*CELL},${6*CELL} ${6*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`} fill="#1e88e5" />

        {PATH_CELLS.map(([c, r], idx) => {
          const p = centerPoint(c, r);
          return <circle key={`track-${idx}`} cx={p.x} cy={p.y} r="4.5" fill="transparent" />;
        })}

        {SAFE_ABS.map((abs) => {
          const [c, r] = PATH_CELLS[visualPathIndex(abs)] || [7, 7];
          const p = centerPoint(c, r);
          return <circle key={`safe-${abs}`} cx={p.x} cy={p.y} r="4.5" fill="#111" />;
        })}

        {allTokens.map((row) => {
          const pos = display[row.key] || { x: 0, y: 0 };
          const isMine = Number(row.player.userId) === Number(myUserId);
          const isMovable = canSelectTokens && isMine && movableTokenIds.includes(row.token.tokenId);
          return (
            <g key={row.key} onClick={() => isMovable && onTokenClick(row.token.tokenId)} style={{ cursor: isMovable ? 'pointer' : 'default' }}>
              {isMovable && <circle cx={pos.x} cy={pos.y} r={18} fill="none" stroke="#111" strokeWidth={2.5} opacity={0.85} />}
              <circle cx={pos.x} cy={pos.y} r={isMovable ? 14 : 12} fill={row.color} stroke={isMovable ? '#111' : '#fff'} strokeWidth={isMovable ? 3 : 2} />
              <text x={pos.x} y={pos.y + 4} fontSize="10" textAnchor="middle" fill="#fff" fontWeight="700">{row.token.tokenId + 1}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
