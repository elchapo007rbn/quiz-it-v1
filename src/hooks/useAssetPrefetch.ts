'use client';
import { useEffect, useRef } from 'react';

/**
 * Warms the assets of later steps while the reader sits on a step that needs
 * none of its own.
 *
 * Measured on a throttled 3G profile (400kbps, 400ms RTT), walking a cold cache
 * from the landing page to step 13: the whole funnel pulls only 422KB, which is
 * about eight seconds of transfer, yet took thirty-five. The weight was never
 * the problem. Every file starts downloading at the instant its step mounts, so
 * each one pays the 400ms round trip alone, one after another, on a link that
 * was idle the entire time the reader was answering questions.
 *
 * Step 13 shows it plainly. Its letter mounts at 1741ms — that is the staged
 * reveal, working as designed — and its bytes land at 11137ms. For 9396ms the
 * reader looks at the beige gradient painted by `.lr-image img.lr-bg`, which is
 * the empty `<img>` showing its own CSS background. The same file on a warm
 * cache took 440ms. Nothing about the file changed; only whether it had been
 * asked for already.
 *
 * Steps 4 through 7 are plain question screens that fetch nothing, and step 14
 * is a text input. That is where this borrows the pipe.
 *
 * Requests are issued one at a time rather than all at once. Overlapping them
 * would split the same narrow link several ways and finish no sooner, and a
 * single outstanding request is what leaves room for the step actually on
 * screen — Chromium is also told `priority: 'low'`, which other engines ignore
 * harmlessly.
 */

/** Fetched, or being fetched. Module scope so a remount does not start over. */
const claimed = new Set<string>();

/** One outstanding request at a time; every caller appends to this chain. */
let queue: Promise<unknown> = Promise.resolve();

function warm(url: string, signal: AbortSignal) {
  if (claimed.has(url)) return;
  claimed.add(url);

  queue = queue.then(async () => {
    if (signal.aborted) return;
    try {
      const res = await fetch(url, {
        signal,
        // Chromium-only hint; ignored elsewhere, never an error.
        priority: 'low',
      } as RequestInit);
      // The body has to be drained or the connection stays open and the next
      // item in the queue waits on a request that already delivered.
      await res.blob();
    } catch {
      // A warm-up that fails costs nothing: the step fetches it again on mount,
      // exactly as it did before this hook existed. Dropping it from `claimed`
      // lets a later step retry.
      claimed.delete(url);
    }
  });
}

/**
 * From which step each group starts warming, ordered by when it is needed.
 *
 * The paywall carousel waits for step 12 on purpose. At 1MB it is by far the
 * heaviest group and the last one wanted, so starting it earlier would push the
 * letter and the portraits behind it — the exact queueing this hook exists to
 * undo. By step 12 everything ahead of it is already cached and the link is
 * free again.
 */
const SCHEDULE: ReadonlyArray<{ from: number; urls: () => string[] }> = [
  {
    from: 4,
    urls: () => [
      '/images/aura-avatar.webp', // steps 8, 9, 11, 13
      '/audio-quiz-it.m4a', // step 11
      // The MP4, unconditionally, because step 11 lists it first — see the
      // `<source>` order there. Branching on `canPlayType` was the obvious
      // alternative and is the wrong bet: a WebView that claims VP9 and then
      // reports SRC_NOT_SUPPORTED would have this warm 595KB the element never
      // touches while the file it does use stays cold.
      '/images/gif01.mp4', // step 11
      '/images/testimonial-sarah.webp', // step 12
      '/images/testimonial-ellen.webp',
      '/images/testimonial-martina.webp',
      '/images/testimonial-chiara.webp',
      '/images/carta-italia.webp', // step 13
    ],
  },
  {
    from: 12,
    urls: () => [1, 2, 3, 4, 5, 6].map(n => `/images/testimonial-fb-${n}.webp`),
  },
];

export function useAssetPrefetch(step: number) {
  // One controller for the whole funnel, not one per step. Tying it to the
  // effect that watches `step` would abort every warm-up still in flight at the
  // moment the reader advances — cancelling exactly the downloads this exists
  // to have finished early.
  const abort = useRef<AbortController | null>(null);
  if (abort.current === null) abort.current = new AbortController();

  useEffect(() => {
    // Someone paying by the megabyte has asked not to be spent on guesses.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;

    const { signal } = abort.current!;
    for (const group of SCHEDULE) {
      if (step >= group.from) group.urls().forEach(url => warm(url, signal));
    }
  }, [step]);

  // Only on the way out.
  useEffect(() => () => abort.current?.abort(), []);
}
