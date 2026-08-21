/**
 * Hand-off to the producer's checkout, carrying the affiliate attribution and
 * the two fields the funnel collected.
 *
 * Why the URL and not storage: the checkout lives on a different domain, so
 * `localStorage` is walled off from it by origin. Query parameters and a cookie
 * read at click time are the only channels that survive the jump.
 *
 * Why the URL is assembled at click time rather than rendered into an `<a href>`:
 * the producer's own funnel renders a bare link and lets a RedTrack script sweep
 * the DOM afterwards to graft the click id onto it. That works on a static page
 * and is fragile here — any React re-render replaces the mutated node with the
 * original href, and the sale silently loses its attribution. Reading the cookie
 * inside the handler means the id is fetched at the instant it is needed, and no
 * re-render can undo it.
 */

import { CLICK_ID_COOKIE, readCookie } from './tracking';

/** Producer's checkout for this offer. Used when the redirector cannot be reached. */
const CHECKOUT_URL = 'https://quiz.auralyapp.com/checkout-ff/509506ca';

/**
 * The network's own click redirector — the hop the producer's funnel makes and
 * this one was skipping.
 *
 * Measured against it with a live click id: it answers 302 straight to
 * CHECKOUT_URL, never to the page roulette that `app.auralyapp.com/{campaign}`
 * runs, and the URL it hands back carries a *newly minted* click id written into
 * three fields at once — `clickid`, `utm_medium` and `sck`. Passing through here
 * is what records the checkout step against the click; a URL assembled on our
 * side alone never touches their servers, which is why that step stayed at zero
 * while clicks did not.
 *
 * It drops `email` and `FIRSTNAME`: send them and the Location comes back
 * without them. So the hop is made as a background fetch rather than a
 * navigation — the response's final URL is readable from here (their CORS
 * allows it), and the visitor fields are appended to it afterwards. That keeps
 * the producer's attribution and the checkout's autofill, which navigating there
 * directly would have forced us to choose between.
 */
const CLICK_REDIRECTOR = 'https://app.auralyapp.com/click';

/**
 * How long the redirector gets before the click gives up on it.
 *
 * This sits between the tap and the checkout, so it is time the buyer spends
 * looking at an unchanged page. Two and a half seconds is generous for a 302 on
 * mobile data and short enough not to read as a dead button; past it the direct
 * URL is used, which is exactly what this funnel shipped before.
 */
const REDIRECTOR_TIMEOUT_MS = 2500;

/** Affiliate tag — identifies who gets credited for the sale. */
const AFFILIATE_ID = '1izpe5h8';

/**
 * Used when the cookie is missing — an ad blocker, a stripped-down in-app
 * browser, or someone who reached the funnel without passing through RedTrack.
 *
 * Deliberately empty, and meant to stay that way: with no value the `clickid`
 * parameter is dropped from the URL entirely. A catch-all id would make every
 * untracked sale land on the same click in RedTrack's reports — orphan
 * conversions attributed to a click that never happened, which corrupts the
 * attribution data rather than rescuing it. Omitting is the graceful
 * degradation; the sale still completes, it simply goes unattributed.
 */
const CLICK_ID_FALLBACK = '';

export interface CheckoutHandoff {
  /** Collected on step 8. */
  name?: string;
  /** Collected on step 14. */
  email?: string;
}

/**
 * Writes the two collected fields onto the checkout URL.
 *
 * Both spellings of the name, because the producer's own bundle sets both from
 * one value:
 *   r && (n.searchParams.set("FIRSTNAME", r), n.searchParams.set("name", r))
 * The PRD mandates FIRSTNAME and an earlier test here found only `name` filling
 * the field; sending the pair settles it without another round of guessing.
 */
function withVisitorFields(url: URL, { name, email }: CheckoutHandoff): URL {
  const cleanEmail = email?.trim();
  if (cleanEmail) url.searchParams.set('email', cleanEmail);

  const cleanName = name?.trim();
  if (cleanName) {
    url.searchParams.set('name', cleanName);
    url.searchParams.set('FIRSTNAME', cleanName);
  }

  return url;
}

/**
 * Builds the checkout URL. Exported separately from the redirect so it can be
 * asserted on without navigating away.
 *
 * `clickIdOverride` is the id the redirector minted, when the hop was made.
 * Without it the cookie's id is used, which is what shipped before and still
 * covers every path where the hop is skipped or fails.
 *
 * Empty fields are left out rather than sent blank, so a visitor who somehow
 * reaches the paywall without them still gets a working checkout.
 */
export function buildCheckoutUrl(
  { name, email }: CheckoutHandoff,
  clickIdOverride?: string,
): string {
  const url = new URL(CHECKOUT_URL);

  url.searchParams.set('aff', AFFILIATE_ID);

  const clickId = clickIdOverride || readCookie(CLICK_ID_COOKIE) || CLICK_ID_FALLBACK;
  if (clickId) {
    // The three fields the redirector fills, mirrored here so the direct URL and
    // the resolved one hand the checkout the same shape. Which one survives to
    // the sale is the payment platform's business, not something to bet on.
    url.searchParams.set('clickid', clickId);
    url.searchParams.set('utm_medium', clickId);
    url.searchParams.set('sck', clickId);
  }

  return withVisitorFields(url, { name, email }).toString();
}

/**
 * Makes the redirector hop for its side effect, then builds our own URL.
 *
 * The hop is what registers the checkout step against this click — measured:
 * one call, one Checkout in the dashboard, under the profile the original click
 * carried, and repeat calls with the same id do not double-count. What the hop
 * *answers* is deliberately discarded except for the id it minted, because it
 * A/B tests its destination: three consecutive calls sent two visitors to
 * `checkout/prod_UUDRbhe` and one to `checkout-ff/509506ca`. CHECKOUT_URL is a
 * decision made here on currency handling and back-redirect behaviour, and a
 * coin flip at the door is not allowed to overrule it.
 *
 * Every failure path lands on the same URL this funnel shipped before — no click
 * id to send, the request failing, or the timeout expiring. A buyer mid-click is
 * the worst possible audience for an error, so all of it is silent.
 */
export async function resolveCheckoutUrl(data: CheckoutHandoff): Promise<string> {
  const clickId = readCookie(CLICK_ID_COOKIE);
  if (!clickId) return buildCheckoutUrl(data);

  const hop = new URL(CLICK_REDIRECTOR);
  hop.searchParams.set('clickid', clickId);
  hop.searchParams.set('aff', AFFILIATE_ID);

  try {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REDIRECTOR_TIMEOUT_MS);
    const res = await fetch(hop.toString(), { signal: abort.signal });
    clearTimeout(timer);

    const minted = new URL(res.url).searchParams.get('clickid');
    return buildCheckoutUrl(data, minted ?? undefined);
  } catch {
    return buildCheckoutUrl(data);
  }
}

/**
 * Leaves the app for the checkout.
 *
 * `window.location.href`, not the Next router: the destination is another origin,
 * which the router cannot address, and a full document navigation is what the
 * checkout's own tracking expects to see.
 */
export function goToCheckout(data: CheckoutHandoff): void {
  void resolveCheckoutUrl(data).then(url => {
    window.location.href = url;
  });
}
