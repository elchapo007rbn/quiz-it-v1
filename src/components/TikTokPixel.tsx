import Script from 'next/script';

/**
 * TikTok Pixel base tag.
 *
 * All the paid traffic on this funnel comes from TikTok, so this is the pixel
 * that decides what the ad account can optimise for. The body below is TikTok's
 * own snippet from Events Manager, kept verbatim for the same reason RedTrack's
 * is: it is their contract, and reformatting it turns a future snippet update
 * into a diff to reconcile instead of a paste. The one edit is the pixel id,
 * lifted out to the constant above so swapping pixels does not mean editing
 * minified code.
 *
 * `afterInteractive`, not `beforeInteractive`. RedTrack runs during HTML parse
 * because the click-id cookie has to exist before anything reads it; nothing
 * here is read by our own code, and the audience is TikTok's in-app browser on
 * mobile data, where an extra blocking request in <head> is paid for in first
 * paint. `ttq.page()` still fires on the same visit either way.
 *
 * The pixel is loaded from analytics.tiktok.com at runtime. Inside the TikTok
 * in-app browser that host is never blocked — it is the one place this funnel
 * can count on the request going through.
 *
 * What this tag alone can and cannot see: the funnel is a single route, so
 * `ttq.page()` fires once, on arrival, and nothing else. It does not observe a
 * reader reaching the paywall or tapping buy, and `CompletePayment` is out of
 * reach entirely — the checkout is on quiz.auralyapp.com, a different origin.
 */
const TIKTOK_PIXEL_ID = 'DA8DBUJC77U6VIRE2V10';

const TIKTOK_PIXEL_TAG = `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};


  ttq.load('${TIKTOK_PIXEL_ID}');
  ttq.page();
}(window, document, 'ttq');
`;

export function TikTokPixel() {
  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: TIKTOK_PIXEL_TAG }}
    />
  );
}
