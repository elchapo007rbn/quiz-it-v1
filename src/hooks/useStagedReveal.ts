'use client';
import { useEffect, useState } from 'react';

/**
 * Reproduces the original funnel's stacked `setTimeout` reveals: each step's
 * script fires a chain of timers that unhide one element after another.
 *
 * Pass the absolute delays (ms from mount) at which each stage appears; the
 * returned number is how many stages are currently visible, so a component
 * renders `stage > n && <Thing />` instead of juggling booleans.
 */
export function useStagedReveal(delays: readonly number[]): number {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = delays.map((delay, i) =>
      setTimeout(() => setStage(s => Math.max(s, i + 1)), delay)
    );
    return () => timers.forEach(clearTimeout);
    // `delays` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return stage;
}
