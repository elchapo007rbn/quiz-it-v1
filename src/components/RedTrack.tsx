import Script from 'next/script';

/**
 * RedTrack attribution tag, verbatim from the affiliate network.
 *
 * What it does: reads `rtkcid` from the landing URL, or asks
 * `app.auralyapp.com/{rtkcmpid}` for a fresh click id when the ad did not carry
 * one, then writes it to the `rtkclickid-store` cookie for 30 days. That cookie
 * is the whole point — `lib/checkout.ts` reads it at click time and appends it
 * to the checkout URL, which is what credits the sale to this affiliate. It also
 * forwards the Meta `_fbp`/`_fbc` cookies as `sub19`/`sub20` and boots Meta's
 * CAPI param builder.
 *
 * `beforeInteractive` so the tag runs during HTML parse rather than after React
 * hydrates. The cookie has minutes to be written before anyone reaches the
 * paywall, so the timing is not tight — but the network call is fired from a
 * 50ms timer inside the tag, and a visitor who bounces off the landing page
 * should still be attributed.
 *
 * The body is the network's own code: it is their contract, not ours, and
 * reformatting it would make future snippet updates a diff to reconcile instead
 * of a paste. It is served inline rather than from a file because it must not
 * wait on a second round trip.
 *
 * One deliberate restoration: `reportView` below. The network's hosted tag
 * (app.auralyapp.com/track.js) calls `/view?clickid=` after writing the cookie
 * and this transcription had dropped it, which is why the affiliate dashboard
 * counted clicks with a bare zero next to them under View Quiz. The `/click`
 * hop that records the checkout step lives in lib/checkout.ts, and Starquiz /
 * Endquiz are fired from lib/tracking.ts as the same kind of image-pixel hit
 * this tag uses for `/view` — between the four, every column of that dashboard
 * this funnel can reach is covered.
 *
 * One dependency worth knowing about: the Meta CAPI builder is pulled from
 * unpkg.com at runtime. It loads `async` and every call is wrapped in
 * try/catch, so an in-app browser that blocks it degrades quietly and RedTrack
 * attribution still works — only Meta's CAPI enrichment is lost.
 */
const REDTRACK_TAG = `
; (function () {
    try {
        if (window.__rtkMetaCapiLoading) return;
        window.__rtkMetaCapiLoading = true;
        function runMetaCapi() {
            try {
                var lib = window.clientParamBuilder;
                if (lib && typeof lib.processAndCollectAllParams === 'function') {
                    lib.processAndCollectAllParams(window.location.href);
                }
            } catch (e) { }
        }
        if (window.clientParamBuilder) { runMetaCapi(); return; }
        var s = document.createElement('script');
        s.src = 'https://unpkg.com/meta-capi-param-builder-clientjs/dist/clientParamBuilder.bundle.js';
        s.async = true;
        s.onload = runMetaCapi;
        (document.head || document.documentElement).appendChild(s);
    } catch (e) { }
})();

function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
}

var campaignID = "";
var cachebuster = Math.round(new Date().getTime() / 1000);
var rtkClickID;
var rtkfbp = getCookie('_fbp') || '';
var rtkfbc = getCookie('_fbc') || '';
var locSearch = window.location.search;
var urlParams = new URLSearchParams(locSearch);
var pixelParams = "&" + locSearch.substr(1) + "&sub19=" + rtkfbp + "&sub20=" + rtkfbc
if (campaignID == "") {
    campaignID = urlParams.get('rtkcmpid')
}
var initialSrc = "https://app.auralyapp.com/" + campaignID + "?format=json";

function stripTrailingSlash(str) {
    return str.replace(/\\/$/, "");
}

var rawData;

setTimeout(function () {
    if (!urlParams.get('rtkcid')) {
        xhr = new XMLHttpRequest;
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                rawData = JSON.parse(xhr.responseText);
                rtkClickID = rawData.clickid
                setCookie();
                reportView(rtkClickID);
            }
        }
        xhr.open("GET", initialSrc + pixelParams)
        xhr.send();
    } else {
        rtkClickID = urlParams.get('rtkcid')
        setCookie();
        reportView(rtkClickID);
    }
}, 5e1)

/**
 * The network's own tag calls this and the copy here was missing it, which is
 * the whole reason the dashboard showed clicks with no views beside them. Both
 * branches report, matching track.js: a visitor who arrived with a click id
 * already on the URL has still viewed the page.
 */
function reportView(clickID) {
    if (!clickID) return;
    try {
        var v = new XMLHttpRequest;
        v.open("GET", "https://app.auralyapp.com/view?clickid=" + clickID);
        v.send();
    } catch (e) { }
}

function setCookie() {
    var cookieName = "rtkclickid-store", cookieValue = rtkClickID, expirationTime = 86400 * 30 * 1000,
        date = new Date(), dateTimeNow = date.getTime();
    date.setTime(dateTimeNow + expirationTime);
    var date = date.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + "; expires=" + date + "; path=/;"
}
`;

export function RedTrack() {
  return (
    <Script
      id="redtrack-attribution"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: REDTRACK_TAG }}
    />
  );
}
