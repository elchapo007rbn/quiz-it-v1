/**
 * Funnel-step events for the affiliate dashboard.
 *
 * The producer's own funnel (quiz.auralyapp.com) fires these through an
 * `Image().src` pixel at `postback?format=img&type=…&clickid=…` — confirmed by
 * reading their bundle and by a live test (real click id, format=img → the
 * dashboard's Starquiz column incremented after the network's 5-minute sync).
 * The same endpoint without `format=img` (a fetch, no image) answers 200 with a
 * JSON body and de-duplicates identically, which is what this file called
 * before — it looked like a success and never appeared on the dashboard, across
 * hundreds of real clicks. `format=img` is not a cosmetic difference: it is
 * evidently the parameter that puts the hit through the network's conversion
 * pipeline rather than a side ledger.
 *
 * A 1x1 image request de-duplicates per click id server-side, the same way the
 * checkout step does, so a reload or a double tap cannot inflate the count.
 */

/** Reads one browser cookie; empty string when it is not set. */
export function readCookie(name: string): string {
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  if (parts.length !== 2) return '';
  return parts.pop()?.split(';').shift() ?? '';
}

/** Cookie RedTrack writes on this visitor's machine when they arrive from the ad. */
export const CLICK_ID_COOKIE = 'rtkclickid-store';

const POSTBACK = 'https://app.auralyapp.com/postback';

/**
 * Guards against sending the same step twice.
 *
 * Two layers, because the endpoint does not de-duplicate these: a test profile
 * driven through the funnel once, then poked four more times by hand, read 4
 * StartQuiz and 5 EndQuiz on the dashboard. Every repeat is a real row, so one
 * visitor who reloads inflates the funnel.
 *
 * The Set alone was not enough for exactly that reason — it dies with the page,
 * and a reload is a new page. `sessionStorage` survives reloads and lives as
 * long as the tab, which is the span a single funnel run occupies. The producer
 * guards the same way (`sessionStorage.setItem("startQuizFired", "true")`), and
 * that is presumably why they were never bitten by this.
 *
 * The Set stays in front of it as a cheap first check and as the fallback for a
 * WebView where storage throws.
 */
const sent = new Set<string>();

const FIRED_KEY = (type: string) => `funnelFired_${type}`;

function alreadySent(type: string): boolean {
  if (sent.has(type)) return true;
  try {
    return sessionStorage.getItem(FIRED_KEY(type)) === 'true';
  } catch {
    // Storage disabled or partitioned away. The Set still covers this page.
    return false;
  }
}

function markSent(type: string): void {
  sent.add(type);
  try {
    sessionStorage.setItem(FIRED_KEY(type), 'true');
  } catch {
    // Nothing to do: worst case a reload re-reports the step.
  }
}

/**
 * The two strings the producer's own bundle sends, copied from it rather than
 * from the dashboard.
 *
 * This distinction cost a thousand clicks, so it is written down. The dashboard
 * labels its column **Starquiz**, and that label is not the event name: the
 * source sends `StartQuiz`. Those are not the same word case-folded —
 * `starquiz` is missing the **t** of `start`. Meanwhile `Endquiz`, which this
 * file sent for months, folds to exactly `endquiz` and matched all along.
 *
 * That asymmetry is the whole mystery: over 1,047 clicks the dashboard read 0
 * Starquiz and 53 Endquiz off the same function, endpoint and cookie. The
 * endpoint accepts any string and answers 200, so an unrecognised `type` fails
 * as a success and lands nowhere.
 *
 * `Checkout` is deliberately absent. The producer has no such postback — its
 * column is filled by the `/click` redirector hop in lib/checkout.ts, which is
 * already wired and already counting.
 */
export type FunnelEvent = 'StartQuiz' | 'EndQuiz';

/**
 * Reports one funnel step, or does nothing.
 *
 * No click id means the visitor reached the funnel without passing RedTrack —
 * an ad blocker, or a link posted without the campaign parameters. Reporting
 * anyway is not an option: the event would have nothing to attach to.
 */
export function trackFunnelEvent(type: FunnelEvent): void {
  if (alreadySent(type)) return;

  const clickId = readCookie(CLICK_ID_COOKIE);
  if (!clickId) return;

  markSent(type);

  const url =
    `${POSTBACK}?format=img&type=${encodeURIComponent(type)}&clickid=${encodeURIComponent(clickId)}`;

  try {
    // A pixel, not `fetch` — the network's own funnel fires it this way, and
    // this is the request shape confirmed to reach the dashboard's counters.
    new Image().src = url;
  } catch {
    // A step that goes unreported costs a row in a dashboard. Nothing here is
    // worth interrupting a funnel run for.
  }
}
