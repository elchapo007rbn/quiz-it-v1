'use client';

import { useEffect } from 'react';

/**
 * Connection warm-up for the Vturb player that step 15 embeds.
 *
 * WHAT CHANGED WHEN THE PLAYER STOPPED BEING AN IFRAME
 *
 * The Panda embed this replaces could only ever be warmed by DNS. Chrome
 * partitions the HTTP cache by Network Isolation Key — (top-level site,
 * current-frame site) — so a preload issued by this page was stored under
 * (ourSite, ourSite) while the same file requested from inside the player's
 * iframe was looked up under (ourSite, pandavideo). Different keys, entry never
 * found, every byte refetched. Six of the nine tags in that vendor snippet were
 * dropped for exactly that reason.
 * https://developer.chrome.com/blog/http-cache-partitioning
 *
 * Vturb ships a web component, not an iframe. It runs in THIS document, so every
 * request it makes carries this document's cache key — the partitioning problem
 * disappears and `preload` starts paying off for real. That is the substantive
 * win of the swap, not the smaller markup.
 *
 * THE TWO-STAGE LOAD THIS EXISTS TO COLLAPSE
 *
 * The embed's `player.js` is not the player. It is a 5KB loader that reads the
 * element's id and then fetches the actual web component, 263KB, from a second
 * origin path. Left alone those are serial: nothing starts downloading the
 * component until the loader has arrived and run. Preloading both turns one
 * round trip into zero, which is the whole point of the vendor's speed snippet.
 *
 * WHY IT MOUNTS AT STEP 13 AND NOT IN `layout.tsx`
 *
 * The head there is shared by all 16 steps, and a funnel run takes minutes, so
 * warming at boot means the entries have long expired by the time anyone reaches
 * the paywall. Two steps out is close enough to still be warm and early enough
 * to be free. React 19 hoists bare `<link>` elements into `<head>`, so mounting
 * this component is all that is needed.
 */

const SCRIPTS = 'https://scripts.converteai.net';
const CDN = 'https://cdn.converteai.net';
const IMAGES = 'https://images.converteai.net';
const LICENSE = 'https://license.vturb.com';

const ACCOUNT = '0734bb83-01f8-4b0e-88eb-772e50cba793';
const PLAYER_ID = '6a8c3ef348dab67a9e65468a';
const VIDEO_ID = '6a8c3ee19864064a9bff2c80';

/** The 5KB loader from the vendor's embed. Step 15 runs it; this file warms it. */
export const VTURB_PLAYER_SRC = `${SCRIPTS}/${ACCOUNT}/players/${PLAYER_ID}/v4/player.js`;

/** The web component the loader goes on to fetch — 263KB over the wire. */
const SMARTPLAYER = `${SCRIPTS}/lib/js/smartplayer-wc/v4/smartplayer.js`;

/** HLS manifest. 457 bytes, but it gates the first video segment. */
const MANIFEST = `${CDN}/${ACCOUNT}/${VIDEO_ID}/main.m3u8`;

/**
 * The frame the player paints before playback starts.
 *
 * Also hard-coded as the background of `.pw-vsl-player-wrap` in globals.css,
 * because a stylesheet cannot import this constant. Change one, change both.
 */
export const VTURB_COVER = `${IMAGES}/${ACCOUNT}/players/${PLAYER_ID}/cover.jpg`;

export function VturbPreload() {
  /**
   * `window._plt` — the timestamp the player subtracts from to report its
   * `player.ttpi` metric ("time to player interactive"). Measurement only: the
   * component reads it through `get pageLoadTime()` and dispatches the
   * difference. Nothing about loading depends on it.
   *
   * The vendor snippet sets this inline in `<head>`, which is right for a page
   * whose only content is the VSL. Here it would report the wrong thing
   * entirely: this funnel is one document for all 16 steps, so "page load" is
   * the moment the reader landed on step 0 — often several minutes before the
   * player exists. TTPI would come back in minutes and mean nothing.
   *
   * Set on mount instead, which is where this player's loading actually starts.
   * `??=` matches the vendor's `||`: whoever writes it first wins, and
   * smartplayer.js carries the same fallback for the case where neither ran.
   */
  useEffect(() => {
    window._plt ??= performance?.timeOrigin
      ? performance.timeOrigin + performance.now()
      : Date.now();
  }, []);

  return (
    <>
      {/* Four origins, read out of the player script rather than guessed:
          scripts  the loader and the component
          cdn      the HLS manifest and the video segments
          images   the cover frame
          license  the licence check, which gates playback */}
      <link rel="dns-prefetch" href={SCRIPTS} />
      <link rel="dns-prefetch" href={CDN} />
      <link rel="dns-prefetch" href={IMAGES} />
      <link rel="dns-prefetch" href={LICENSE} />

      {/* The vendor snippet stops at dns-prefetch. preconnect goes further —
          TCP and TLS as well as DNS — and costs nothing extra here because all
          four origins are certain to be hit two steps later. */}
      <link rel="preconnect" href={SCRIPTS} />
      <link rel="preconnect" href={CDN} />
      <link rel="preconnect" href={IMAGES} />
      <link rel="preconnect" href={LICENSE} />

      {/* Both stages of the player, fetched in parallel instead of one after the
          other. `as="script"` with no crossorigin matches how a plain
          `<script src>` requests them; a mismatch on either would download the
          file twice rather than once. */}
      <link rel="preload" as="script" href={VTURB_PLAYER_SRC} />
      <link rel="preload" as="script" href={SMARTPLAYER} />

      {/* The manifest, so the first segment request does not wait on it. */}
      <link rel="preload" as="fetch" href={MANIFEST} crossOrigin="anonymous" />

      {/* The cover frame, painted as the background of .pw-vsl-player-wrap so
          the reader looks at the video's own first frame during the moment the
          player spends booting, rather than the flat black the vendor
          placeholder ships. THIS document consumes it, so unlike the Panda
          equivalent the preload lands in the cache the player will read from. */}
      <link rel="preload" as="image" href={VTURB_COVER} />
    </>
  );
}
