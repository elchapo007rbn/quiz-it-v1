'use client';
import { useEffect, useState } from 'react';
import { readSession, gateRemaining } from '@/lib/session';

interface Props {
  /** The gate's full length in seconds — REVEAL_AT, owned by Step15Paywall. */
  revealAt: number;
  /**
   * The gate is open. Comes from the step's own `revealed` rather than from
   * this component's arithmetic, so the QA escape hatch `window.revealNow()`
   * and the dev skip — both of which open the offer without touching the
   * clock — cannot leave a chip counting down over an offer already on screen.
   */
  done: boolean;
}

const mmss = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

/**
 * The chip above the VSL that says how long until the offer opens.
 *
 * Its own component, and deliberately a small one: it re-renders every second
 * for the length of the gate, and the paywall it sits in holds the Vturb player
 * plus every section below it. Ticking inside that step would re-render the
 * whole page once a second on a cheap Android with a video playing.
 *
 * It reads the session itself rather than being handed the number the step
 * already computed. Lifting it to the step would mean a setState in the step's
 * gate effect, which is the cascading render this component exists to avoid.
 * Both reads happen at mount off the same stored `videoWatched`, so they agree.
 *
 * It counts PAGE time, because that is what the gate counts. The step's
 * `setTimeout` runs on wall-clock and never looks at the player, so a chip that
 * paused with the video would stop while the gate kept going, and the offer
 * would open with the number frozen mid-count. Whichever of the two is right,
 * they have to be the same one.
 */
export function RevealTimer({ revealAt, done }: Props) {
  const [left, setLeft] = useState<number | null>(null);

  /**
   * Derives the number from a fixed deadline rather than counting ticks.
   *
   * A background tab has its intervals throttled to something far coarser than
   * a second — and this funnel's reader is one bottom sheet away from being in
   * exactly that state. Counting ticks would drift behind by however long she
   * was away, so the chip would still be promising a minute after the offer had
   * opened. Reading the clock each tick means a dropped tick costs nothing: the
   * next one lands on the right number.
   *
   * Storage is read here, post-mount, for the same hydration reason the step
   * reads it there: the server has no session to render from.
   */
  useEffect(() => {
    const saved = readSession();
    const seconds = saved?.ctaUnlocked === true
      ? 0
      : gateRemaining(revealAt, saved?.videoWatched ?? 0);

    const deadline = Date.now() + seconds * 1000;
    const tick = () => {
      const rest = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(rest);
      return rest;
    };

    if (tick() === 0) return;
    const id = setInterval(() => {
      if (tick() === 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [revealAt]);

  if (done || left === 0) {
    return (
      <span className="pw-rt pw-rt-done">
        <span className="pw-rt-ico">✓</span>
        <span>La tua lettura è sbloccata qui sotto</span>
      </span>
    );
  }

  return (
    <span className="pw-rt">
      <span className="pw-rt-ico">🔒</span>
      <span>Il tuo destino amoroso cambia tra:</span>
      {/* Held at zero opacity rather than left out until storage has been read:
          the digits are the widest part of the chip, and letting them appear a
          frame later would shift the title and the player underneath. Nothing
          is shown in the meantime because 03:48 would be the wrong number for
          every reader coming back to finish the video. */}
      {/* One fixed-width cell per character, because the clock cannot be
          allowed to change width. `font-variant-numeric: tabular-nums` is
          declared and computes, but DM Sans ships no `tnum` table, so a 1 is
          10px narrower than a 0 - and since the chip is centred, every tick
          slid it sideways. Measured: 40.09px at 00:00 against 26.95px at
          01:11. Giving each digit its own box makes the width a constant the
          font cannot argue with. */}
      <span className="pw-rt-num" style={left === null ? { opacity: 0 } : undefined}>
        {mmss(left ?? 0).split('').map((ch, i) => (
          <span key={i} className={ch === ':' ? 'pw-rt-colon' : 'pw-rt-d'}>{ch}</span>
        ))}
      </span>
    </span>
  );
}
