/**
 * Funnel session, persisted across a closed TikTok bottom sheet.
 *
 * Why this exists: the funnel is opened inside TikTok's in-app WebView, which
 * the reader can dismiss with a swipe, by tapping X, or by switching apps. Tap
 * the ad again and the WebView reloads the URL from scratch — every answer
 * gone, back to step 0. Enough people give up at that point to be worth the
 * code here.
 *
 * `localStorage` and not `sessionStorage`: sessionStorage is scoped to the tab,
 * and a dismissed bottom sheet is a destroyed tab. localStorage is keyed by
 * origin, survives the dismissal, and the domain is fixed.
 *
 * Everything here fails silently. A funnel that throws because a storage quota
 * was hit is strictly worse than a funnel with no persistence, so every entry
 * point is wrapped and every failure degrades to "no saved session".
 */

import type { QuizAnswers } from '@/types/quiz';
import { TOTAL_STEPS } from '@/types/quiz';

/** Namespaced, so a second funnel on this domain cannot collide with it. */
export const SESSION_KEY = 'quiz_soulmate_session';

/** 24 hours. Past this the answers are stale enough to be noise. */
export const SESSION_TTL_MS = 86_400_000;

export interface QuizSession {
  /** Step the reader had reached, 0–15. */
  step: number;
  answers: QuizAnswers;
  /** Multi-select state lives outside `answers` until the step is left. */
  patterns: string[];
  desires: string[];
  importance: string[];
  /** Furthest second of the VSL reached, used to discount the paywall gate. */
  videoWatched: number;
  /** True once the gate has opened, so a return visit is never re-gated. */
  ctaUnlocked: boolean;
  /** `Date.now()` at the last write. Drives expiry. */
  timestamp: number;
}

const EMPTY: Omit<QuizSession, 'timestamp'> = {
  step: 0,
  answers: { name: '' },
  patterns: [],
  desires: [],
  importance: [],
  videoWatched: 0,
  ctaUnlocked: false,
};

/**
 * A blob is stale past the TTL, and also whenever its timestamp is in the
 * future — that can only mean a clock change or a hand-edited value, and
 * trusting it would pin the session open forever.
 */
export function isExpired(timestamp: number, now: number): boolean {
  return timestamp > now || now - timestamp >= SESSION_TTL_MS;
}

/**
 * Seconds the reader still has to wait before the offer appears.
 *
 * `watched` is the furthest point reached in the VSL, so someone who left at
 * 3:20 and came back waits the remaining 28 seconds instead of the full 3:48.
 * A negative `watched` is treated as zero rather than extending the wait: bad
 * data should never make the funnel harsher than a first visit.
 */
export function gateRemaining(revealAt: number, watched: number): number {
  return Math.max(0, revealAt - Math.max(0, watched));
}

/** Narrow an unknown parsed payload to a session, rejecting anything off-shape. */
function isSession(v: unknown): v is QuizSession {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.step === 'number' &&
    Number.isInteger(s.step) &&
    s.step >= 0 &&
    s.step < TOTAL_STEPS &&
    typeof s.timestamp === 'number' &&
    typeof s.answers === 'object' &&
    s.answers !== null &&
    Array.isArray(s.patterns) &&
    Array.isArray(s.desires) &&
    Array.isArray(s.importance) &&
    typeof s.videoWatched === 'number' &&
    typeof s.ctaUnlocked === 'boolean'
  );
}

/**
 * Reads the saved session, or null when there is nothing usable.
 *
 * `now` is a parameter rather than a `Date.now()` call so expiry can be tested
 * without freezing the clock.
 */
export function readSession(now: number = Date.now()): QuizSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) return null;

    if (isExpired(parsed.timestamp, now)) {
      clearSession();
      return null;
    }

    return parsed;
  } catch {
    // Malformed JSON, a disabled storage API, or a security error in a locked
    // down WebView. All of them mean the same thing here: no saved session.
    return null;
  }
}

/** Merges `patch` into the stored session and stamps it with `now`. */
export function writeSession(patch: Partial<QuizSession>, now: number = Date.now()): void {
  try {
    const current = readSession(now) ?? { ...EMPTY, timestamp: now };
    const next: QuizSession = { ...current, ...patch, timestamp: now };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded, storage disabled, or serialisation failure. The funnel
    // continues without persistence rather than surfacing an error.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to do. The blob expires on its own within 24 hours.
  }
}
