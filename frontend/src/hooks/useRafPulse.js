import { useEffect } from 'react';
import { useGameStore } from '../store/game.store';

export function useRafPulse(active = true) {
  const setPulse = useGameStore((s) => s.setPulse);

  useEffect(() => {
    if (!active) return undefined;

    let raf;
    const start = performance.now();

    const tick = (now) => {
      const t = (now - start) / 1000;
      const value = (Math.sin(t * 3) + 1) / 2;
      setPulse(value);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, setPulse]);
}
