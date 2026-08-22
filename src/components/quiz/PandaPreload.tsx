'use client';

/**
 * Connection warm-up for the Panda player that step 15 embeds.
 *
 * Panda ships a nine-tag snippet for this and asks for it in `<head>`. Most of
 * it is dropped here, and the reason is the same one for all of it: the player
 * lives in a cross-origin iframe.
 *
 * WHAT WAS DROPPED, AND WHY
 *
 * The six `<link rel=preload>` tags — 159KB of player CSS plus the config and
 * manifest. Chrome partitions the HTTP cache by Network Isolation Key, which is
 * (top-level site, current-frame site). A preload issued by this page is stored
 * under (ourSite, ourSite); the same file requested from inside the Panda iframe
 * is looked up under (ourSite, pandavideo). Different keys, so the entry is
 * never found and the iframe refetches every byte. Keeping them would not warm
 * anything — it would download 159KB twice, once for a page that never renders
 * it. Preload only pays off for resources *this document* consumes.
 * https://developer.chrome.com/blog/http-cache-partitioning
 *
 * The `<link rel=prerender>` tag. Chrome retired it in favour of the Speculation
 * Rules API and treats it as a no-op; Safari and Firefox never shipped it. It
 * would also be redundant — by the time step 15 renders, the iframe is in the
 * markup already.
 *
 * WHAT SURVIVES
 *
 * DNS is resolved by a host cache that sits outside the partitioned HTTP cache,
 * so a lookup done here still spares the iframe from doing it. That is the one
 * part of the snippet an iframe embed can actually benefit from, and it costs no
 * bandwidth at all. `preconnect` rides along for engines whose socket pools are
 * partitioned less strictly than Chrome's; where that does not hold, it
 * degrades to the DNS win the prefetch already provides.
 *
 * WHY IT MOUNTS AT STEP 13 AND NOT IN `layout.tsx`
 *
 * The head there is shared by all 16 steps, and a funnel run takes minutes, so
 * resolving at boot means the entry has long expired by the time anyone reaches
 * the paywall. Two steps out is close enough to still be warm and early enough
 * to be free. React 19 hoists bare `<link>` elements into `<head>`, so mounting
 * this component is all that is needed.
 */

const PLAYER = 'https://player-vz-b2ed02ae-754.tv.pandavideo.com.br';
const CONFIG = 'https://config.tv.pandavideo.com.br';
const STREAM = 'https://b-vz-b2ed02ae-754.tv.pandavideo.com.br';
const VIDEO = '2d1f413c-6c10-4b25-97c8-60c42bbd0ec8';
const LIBRARY = 'vz-b2ed02ae-754';

export function PandaPreload() {
  return (
    <>
      {/* Three origins: the player shell, the config API, and the CDN the video
          segments stream from. Panda's snippet prefetches only two of them and
          leaves out config.tv, which is the one gating everything else — the
          player cannot request a single segment before it has read that. */}
      <link rel="dns-prefetch" href={PLAYER} />
      <link rel="dns-prefetch" href={CONFIG} />
      <link rel="dns-prefetch" href={STREAM} />

      <link rel="preconnect" href={PLAYER} />
      <link rel="preconnect" href={CONFIG} />
      <link rel="preconnect" href={STREAM} />

      {/* The one preload that survives the partitioning problem described above,
          because THIS document is what consumes it: the cover frame is painted
          as the background of .pw-vsl-player-wrap, so it is fetched under our own
          cache key rather than the iframe's. 42KB, and it is what the reader
          looks at during the second or two the embed spends booting. */}
      <link rel="preload" as="image" href={`${STREAM}/${VIDEO}/thumbnail.jpg`} />

      {/* The three small fetches from Panda's snippet, kept while its three CSS
          preloads stay dropped. Measured from the instant step 15 mounts, on a
          throttled connection:

            +1785ms  PANDA_READY     the player shell — 159KB of CSS and its JS
            +2428ms  panda_ready
            +3176ms  panda_progress  first video segments
            +4057ms  panda_canplay   first frame
            +4100ms  panda_play

          The middle slice is these three files. They are a few KB against the
          CSS's 159KB, so the partitioning risk that disqualified the rest costs
          almost nothing here: if the iframe cannot reuse them the waste is
          negligible, and if it can, the config round trips are already paid.
          Whether WebKit — which is what TikTok's in-app browser runs, and which
          partitions differently from Chrome — reuses them is not something this
          machine can test; the field is the only place that answers it.

          No `crossorigin`, matching Panda's own snippet. */}
      <link rel="preload" as="fetch" href={`${CONFIG}/${LIBRARY}/${VIDEO}.json`} />
      <link rel="preload" as="fetch" href={`${CONFIG}/${LIBRARY}/config.json`} />
      <link rel="preload" as="fetch" href={`${STREAM}/${VIDEO}/playlist.m3u8`} />
    </>
  );
}
