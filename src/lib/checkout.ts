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

/** Reads one browser cookie; empty string when it is not set. */
function readCookie(name: string): string {
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  if (parts.length !== 2) return '';
  return parts.pop()?.split(';').shift() ?? '';
}

/** Producer's checkout for this offer. */
const CHECKOUT_URL = 'https://quiz.auralyapp.com/checkout-ff/509506ca';

/** Affiliate tag — identifies who gets credited for the sale. */
const AFFILIATE_ID = '1i';

/** Cookie RedTrack writes on this visitor's machine when they arrive from the ad. */
const CLICK_ID_COOKIE = 'rtkclickid-store';

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
 * Builds the checkout URL. Exported separately from the redirect so it can be
 * asserted on without navigating away.
 *
 * Parameter names are the producer's and are case-sensitive: both `email` and
 * `name` lowercase. The PRD originally specified `FIRSTNAME`, which is what the
 * producer's own funnel sends; testing against the European checkout showed that
 * key is no longer honoured there and the field arrived blank while the email
 * filled in correctly. Renaming either breaks the autofill on their side.
 *
 * Empty fields are left out rather than sent blank, so a visitor who somehow
 * reaches the paywall without them still gets a working checkout.
 */
export function buildCheckoutUrl({ name, email }: CheckoutHandoff): string {
  const url = new URL(CHECKOUT_URL);

  url.searchParams.set('aff', AFFILIATE_ID);

  const clickId = readCookie(CLICK_ID_COOKIE) || CLICK_ID_FALLBACK;
  if (clickId) url.searchParams.set('clickid', clickId);

  const cleanEmail = email?.trim();
  if (cleanEmail) url.searchParams.set('email', cleanEmail);

  const cleanName = name?.trim();
  if (cleanName) url.searchParams.set('name', cleanName);

  return url.toString();
}

/**
 * Leaves the app for the checkout.
 *
 * `window.location.href`, not the Next router: the destination is another origin,
 * which the router cannot address, and a full document navigation is what the
 * checkout's own tracking expects to see.
 */
export function goToCheckout(data: CheckoutHandoff): void {
  window.location.href = buildCheckoutUrl(data);
}
