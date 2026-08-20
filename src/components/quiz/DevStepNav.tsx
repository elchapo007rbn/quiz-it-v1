'use client';
import { useEffect } from 'react';

/**
 * ⚠️ DEVELOPMENT-ONLY step jumper — NOT part of the funnel.
 *
 * The real funnel only ever shows a back arrow on steps 1 and 2 (`.aur-back`);
 * from step 3 onward there is deliberately no way back, and that behaviour is
 * validated — it must survive to production untouched. This overlay exists
 * purely so the funnel can be reviewed page by page during development.
 *
 * It is rendered behind `process.env.NODE_ENV === 'development'`, which the
 * bundler replaces with a literal at build time, so `next build` drops it as
 * dead code. To remove it for good: delete this file and the guarded block in
 * QuizContainer that renders it — nothing else references it.
 */

const TOTAL = 15; // steps 0-15

/** Short handles so a page can be named in conversation ("ajusta a 10"). */
const STEP_LABELS = [
  'Landing',
  'Gender',
  'Interest',
  'Transition',
  'Love life',
  'Patterns',
  'Desires',
  'Priorities',
  'Name (chat)',
  'Zodiac',
  'Birth chart',
  'Audio',
  'Testimonials',
  'Revelation',
  'Email',
  'Paywall',
];

interface Props {
  step: number;
  onStep: (step: number) => void;
}

export function DevStepNav({ step, onStep }: Props) {
  const go = (delta: number) => onStep(Math.min(TOTAL, Math.max(0, step + delta)));

  // ←/→ shortcuts, but never while typing: steps 8 and 14 have text inputs
  // where the arrow keys must keep moving the caret.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;

      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <button
        className="devnav-arrow devnav-left"
        onClick={() => go(-1)}
        disabled={step === 0}
        aria-label="Dev: previous step"
        type="button"
      >
        &lsaquo;
      </button>

      <button
        className="devnav-arrow devnav-right"
        onClick={() => go(1)}
        disabled={step === TOTAL}
        aria-label="Dev: next step"
        type="button"
      >
        &rsaquo;
      </button>

      <div className="devnav-badge">
        <b>{step}</b> · {STEP_LABELS[step] ?? '—'}
      </div>
    </>
  );
}
