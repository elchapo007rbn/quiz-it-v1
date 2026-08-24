'use client';

/**
 * Warm-up for the VSL player that step 15 mounts.
 *
 * This file used to fight a losing battle. The player was a cross-origin
 * `<iframe>`, and Chrome partitions the HTTP cache by Network Isolation Key —
 * (top-level site, current-frame site) — so a preload issued here was filed
 * under (ourSite, ourSite) while the iframe looked under (ourSite, theirSite).
 * Different keys, entry never found, every byte fetched twice. All that
 * survived was DNS, which lives outside the partitioned cache.
 * https://developer.chrome.com/blog/http-cache-partitioning
 *
 * The move to VTurb removes the frame, and with it the problem. Its player is a
 * custom element that runs in this document, so what this file fetches is what
 * the player later uses — same document, same cache key. Preload finally pays.
 *
 * WHAT IS WARMED
 *
 * The component library, which is the reason this matters at all: 964KB, the
 * largest single file in the funnel — more than every image on the paywall put
 * together. Reaching step 15 without it already in cache means watching it
 * arrive.
 *
 * The loader that pulls it, at high priority. Only 11KB, but everything waits
 * on it: it registers the element, injects its own preloads and starts
 * playback. `as="script"` puts both in the cache without running either —
 * execution belongs to step 15, where the element they look for exists.
 *
 * The HLS manifest, with `crossorigin` to match how the player requests it. A
 * preload whose CORS mode differs from the eventual fetch is not reused, so the
 * attribute is load-bearing rather than decorative. This mirrors the loader's
 * own first act, two steps earlier.
 *
 * The poster, which is the first thing painted.
 *
 * Connections to the three origins the player touches: its CDN, its image host
 * and its licence endpoint. Nothing renders until the licence call returns, and
 * it is the one nobody thinks to warm.
 *
 * WHY IT MOUNTS AT STEP 13 AND NOT IN `layout.tsx`
 *
 * The head there is shared by all 16 steps and a funnel run takes minutes, so
 * warming at boot spends bandwidth the landing page needs on entries that have
 * gone cold by the time anyone reaches the paywall. Two steps out is close
 * enough to still be warm and early enough to be free. React 19 hoists bare
 * `<link>` elements into `<head>`, so mounting this component is all it takes.
 */

const ACCOUNT = '0734bb83-01f8-4b0e-88eb-772e50cba793';
const PLAYER_ID = '6a8c3ef348dab67a9e65468a';
const VIDEO_ID = '6a8c3ee19864064a9bff2c80';

const SCRIPTS = 'https://scripts.converteai.net';
const CDN = 'https://cdn.converteai.net';
const IMAGES = 'https://images.converteai.net';
const LICENSE = 'https://license.vturb.com';

const LOADER = `${SCRIPTS}/${ACCOUNT}/players/${PLAYER_ID}/v4/player.js`;
const COMPONENT = `${SCRIPTS}/lib/js/smartplayer-wc/v4/smartplayer.js`;
const MANIFEST = `${CDN}/${ACCOUNT}/${VIDEO_ID}/main.m3u8`;
const POSTER = `${CDN}/${ACCOUNT}/${VIDEO_ID}/poster.jpg`;

export function VslPreload() {
  return (
    <>
      <link rel="dns-prefetch" href={SCRIPTS} />
      <link rel="dns-prefetch" href={CDN} />
      <link rel="dns-prefetch" href={IMAGES} />
      <link rel="dns-prefetch" href={LICENSE} />

      <link rel="preconnect" href={SCRIPTS} crossOrigin="anonymous" />
      <link rel="preconnect" href={CDN} crossOrigin="anonymous" />
      <link rel="preconnect" href={IMAGES} />
      <link rel="preconnect" href={LICENSE} />

      <link rel="preload" as="script" href={COMPONENT} fetchPriority="high" />
      <link rel="preload" as="script" href={LOADER} fetchPriority="high" />
      <link rel="preload" as="fetch" href={MANIFEST} crossOrigin="anonymous" />
      <link rel="preload" as="image" href={POSTER} />
    </>
  );
}
