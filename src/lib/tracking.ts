/**
 * Funnel-step events for the affiliate dashboard.
 *
 * The producer's own funnel (quiz.auralyapp.com) fires these through an
 * `Image().src` pixel at `postback?format=img&type=…&clickid=…` — confirmed by
 * reading their bundle and by a live test (real click id, format=img → the
 * dashboard's StartQuiz column incremented after the network's 5-minute sync).
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
 * Sent at most once per page life. The endpoint already refuses repeats, but a
 * request that exists only to be rejected still costs a visitor on mobile data
 * the round trip.
 */
const sent = new Set<string>();

/**
 * Exactly the strings the network's own funnel sends — `StartQuiz` with the
 * capital Q, not the `Starquiz` this file used to send and not the spelling the
 * dashboard column uses. Intercepting `Image.src` on quiz.auralyapp.com caught
 * it firing `type=StartQuiz`, and the mismatch explains the numbers: `Endquiz`
 * was already spelled the way they spell it and counted 22, while `Starquiz`
 * sat at 0 across ~200 clicks. The endpoint accepts any string, so a wrong one
 * fails as a success.
 */
export type FunnelEvent = 'StartQuiz' | 'Endquiz';

/**
 * Reports one funnel step, or does nothing.
 *
 * No click id means the visitor reached the funnel without passing RedTrack —
 * an ad blocker, or a link posted without the campaign parameters. Reporting
 * anyway is not an option: the event would have nothing to attach to.
 */
export function trackFunnelEvent(type: FunnelEvent): void {
  if (sent.has(type)) return;

  const clickId = readCookie(CLICK_ID_COOKIE);
  if (!clickId) return;

  sent.add(type);

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
