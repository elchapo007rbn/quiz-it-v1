/**
 * Funnel events for the TikTok Pixel.
 *
 * Separate from `tracking.ts` on purpose, and the reason is a behaviour that
 * file documents about itself: `trackFunnelEvent` returns early when the
 * `rtkclickid-store` cookie is missing, because an affiliate postback with no
 * click id has nothing to attach to. That is correct for RedTrack and wrong
 * here — TikTok attributes on its own `ttclid`/cookie, so a reader whose
 * RedTrack cookie was blocked is still a reader TikTok can learn from. Routing
 * both through one function would have made every ad-blocked visitor invisible
 * to the ad account as well as to the affiliate dashboard.
 *
 * What this funnel can and cannot report, decided by where the money changes
 * hands: the checkout is on quiz.auralyapp.com, a different origin, so
 * `Purchase` and `AddPaymentInfo` are unreachable from here — no script of ours
 * runs on the page where either happens. Those two need the server-side Events
 * API, keyed off the payment platform's webhook. `ttq.identify` is likewise
 * empty-handed: it wants a SHA-256 email, and step 14 (the email capture) is
 * archived, so no email is collected on this domain at all.
 */

/** The queue the pixel snippet installs on `window`. Absent if it was blocked. */
interface TikTokQueue {
  track: (event: string, params?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    ttq?: TikTokQueue;
  }
}

/** The offer, as TikTok's `contents` schema wants it. */
const CONTENT_ID = '509506ca';
const CONTENT_NAME = 'Lettura Anima Gemella';

/** First-month price on the paywall. The plan renews at 29€; 9 is what is charged today. */
const PRICE = 9;
const CURRENCY = 'EUR';

/**
 * The three events this domain can honestly observe.
 *
 * `CompleteRegistration` is deliberately absent: the moment it would describe —
 * the reader finishing the quiz — is the same mount that already fires
 * `ViewContent`, and two events on one instant teaches the algorithm nothing
 * the first did not.
 */
export type TikTokEvent = 'ViewContent' | 'InitiateCheckout';

const sent = new Set<string>();

const FIRED_KEY = (event: string) => `ttqFired_${event}`;

function alreadySent(event: string): boolean {
  if (sent.has(event)) return true;
  try {
    return sessionStorage.getItem(FIRED_KEY(event)) === 'true';
  } catch {
    // Storage disabled or partitioned away — the Set still covers this page.
    return false;
  }
}

function markSent(event: string): void {
  sent.add(event);
  try {
    sessionStorage.setItem(FIRED_KEY(event), 'true');
  } catch {
    // Worst case a reload re-reports the step.
  }
}

/**
 * Reports one funnel step to the pixel.
 *
 * `once` is not a detail — the two call sites want opposite things, for the
 * reasons their own code already documents. The paywall mounts again on a
 * restored session, so `ViewContent` guards against counting one reader twice.
 * The buy button does not guard: `goToCheckout` swallows a double *tap* on its
 * own with a timestamp window, and past that window a second attempt is a real
 * second attempt — the comment there spells out that a reader who reaches the
 * checkout, reconsiders and comes back has to get through. Deduplicating here
 * would silently contradict that.
 *
 * Every failure is swallowed. A missing `window.ttq` is the normal case in a
 * stripped-down in-app browser or behind an ad blocker, and no analytics event
 * is worth interrupting a funnel run for.
 */
export function trackTikTokEvent(event: TikTokEvent, { once = false } = {}): void {
  if (once && alreadySent(event)) return;

  const ttq = typeof window === 'undefined' ? undefined : window.ttq;
  if (!ttq) return;

  if (once) markSent(event);

  try {
    ttq.track(event, {
      contents: [
        {
          content_id: CONTENT_ID,
          content_type: 'product',
          content_name: CONTENT_NAME,
          price: PRICE,
        },
      ],
      value: PRICE,
      currency: CURRENCY,
    });
  } catch {
    // Nothing here is worth breaking a funnel run for.
  }
}
