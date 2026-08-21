/**
 * Funnel-step events for the affiliate dashboard.
 *
 * The network exposes `app.auralyapp.com/postback?clickid=…&type=…`, which the
 * producer's own funnel never calls — it fires those two steps as Facebook and
 * Bing pixel events instead, so no amount of reading their bundle turns this
 * endpoint up. Verified directly against it with a fresh click id:
 *
 *   type=Starquiz  →  {"status":1,"message":"OK"}                        200
 *   type=Endquiz   →  {"status":1,"message":"OK"}                        200
 *   repeat         →  {"status":0,"message":"same clickid: …exists"}     400
 *
 * It de-duplicates per click id, the same way the checkout step does, so a
 * reload or a double tap cannot inflate the count.
 *
 * `no-cors` because the response is not needed and asking for it would only
 * trade a working request for a console error: the endpoint sends no CORS
 * headers, so a readable fetch is rejected before it is ever sent. The reply is
 * opaque here — the verification above was done outside the browser, where that
 * restriction does not apply.
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

export type FunnelEvent = 'Starquiz' | 'Endquiz';

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
    `${POSTBACK}?clickid=${encodeURIComponent(clickId)}&type=${encodeURIComponent(type)}`;

  try {
    // `keepalive` so the request survives the step change that triggered it.
    void fetch(url, { mode: 'no-cors', keepalive: true }).catch(() => {});
  } catch {
    // A step that goes unreported costs a row in a dashboard. Nothing here is
    // worth interrupting a funnel run for.
  }
}
