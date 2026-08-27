'use client';

import { useEffect, useState } from 'react';
import {
  isAndroidTikTok,
  isPauseNoticeForced,
  markPauseNoticeSeen,
  wasPauseNoticeSeen,
} from '@/lib/pauseNotice';

/**
 * Review escape hatch, and it must stay `false` in anything published.
 *
 * When true the notice appears on every visit from every device, skipping both
 * the user agent check and the once-per-24h flag — which is what made it
 * reviewable on a real phone without clearing site data between passes. Shipped
 * true it would show the notice a second time to exactly the people who did
 * what it asked: closed the sheet, paused the feed, tapped the link again. That
 * is the loop `wasPauseNoticeSeen` exists to stop.
 *
 * Unlike a `NODE_ENV` guard this is a live runtime branch — nothing strips it
 * at build time, so the value here is the value that ships.
 */
const ALWAYS_SHOW = false;

/** Lets the landing paint before the notice interrupts it. */
const ENTER_DELAY_MS = 400;
/** Matches the exit transition in `globals.css`; unmounts once it has run. */
const EXIT_MS = 150;

/**
 * Asks an Android visitor arriving from TikTok to pause the feed video before
 * starting the quiz.
 *
 * Why a request and not a fix: on Android the audio focus is cooperative, the
 * TikTok feed ignores it, and the WebView shares the app's UID — no front-end
 * technique silences the feed. See `docs/research/VIEWPORT-TELEMETRY.md`.
 *
 * The button cannot perform the action either: the X that dismisses the sheet
 * belongs to TikTok's native chrome, above our viewport, and nothing we render
 * can reach it. So the tap does the one thing it can — it hands attention over
 * to the marker sitting directly beneath that X.
 */
export function PauseNotice() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pointing, setPointing] = useState(false);

  useEffect(() => {
    const bypass = ALWAYS_SHOW || isPauseNoticeForced();
    if (!bypass && (!isAndroidTikTok() || wasPauseNoticeSeen())) return;

    // The write happens inside the timer, not here, and the difference matters.
    // `QuizContainer` restores a saved session in an effect, so step 0 renders
    // for one frame before jumping to the saved step — long enough to mount
    // this component and run this effect. Recording the visit at that point
    // would burn the flag for someone who never saw anything, and the notice
    // would then stay hidden when she really does start over.
    //
    // Recorded on appearance rather than on dismissal for the opposite reason:
    // she is being asked to close the sheet and tap the link again, which
    // reloads the page, so waiting for a dismissal would show her the notice a
    // second time precisely for having obeyed it.
    const t = setTimeout(() => {
      if (!bypass) markPauseNoticeSeen();
      setMounted(true);
    }, ENTER_DELAY_MS);

    // Unmounting inside that window — the session restore jumping away — clears
    // the timer, so nothing is shown and nothing is written.
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Two frames, not one: a single rAF still lands inside the same style
    // recalculation on slower WebViews, and the transition is skipped.
    //
    // The timeout is not redundant. A tab that is not compositing suspends rAF
    // entirely — a backgrounded WebView, a hidden tab — and the callback simply
    // never runs. Without the fallback the notice would stay at opacity 0 with
    // the page scroll still locked underneath it, which is the worst state this
    // component can be in. Whichever fires first wins; the loser is a no-op.
    let opened = false;
    const reveal = () => {
      if (opened) return;
      opened = true;
      setOpen(true);
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(reveal));
    const fallback = setTimeout(reveal, 60);

    // Locking the scroll keeps TikTok's bar — and the X the marker points at —
    // from retracting while the notice is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(id);
      clearTimeout(fallback);
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  if (!mounted) return null;

  /** Backdrop tap is the way past the notice — an escape hatch, not an offer. */
  function dismiss() {
    setOpen(false);
    setTimeout(() => setMounted(false), EXIT_MS);
  }

  return (
    <div className="pn-root" data-open={open} data-pointing={pointing}>
      <div className="pn-backdrop" onClick={dismiss} />

      <div className="pn-marker" aria-hidden="true">
        <svg className="pn-marker-up" viewBox="0 0 24 24" fill="none">
          <path d="M12 19V6m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="pn-marker-dot">
          <span className="pn-ring" />
          <span className="pn-ring pn-ring2" />
          <svg viewBox="0 0 24 24" className="pn-marker-hand">
            <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74a4 4 0 1 0-8 0c0 1.56.79 2.93 2 3.74z" />
            <path d="M18.84 15.87l-4.54-2.26a1.2 1.2 0 0 0-.54-.11H13v-6a1.5 1.5 0 1 0-3 0v10.74l-3.44-.72a1 1 0 0 0-.97 1.68l3.6 3.6c.37.37.88.58 1.41.58h6.1c.99 0 1.83-.72 1.98-1.7l.66-4.31c.13-.83-.3-1.64-1.05-2z" />
          </svg>
        </span>
      </div>

      <div className="pn-card" role="dialog" aria-modal="true" aria-labelledby="pn-title">
        <div className="pn-head">
          <h2 className="pn-title" id="pn-title">
            <span className="pn-emoji" aria-hidden="true">🚨</span> ACCESSO SOSPESO…
          </h2>

          <p className="pn-sub">
            La tua anima gemella merita
            <br />
            <b>tutta la tua attenzione</b>
          </p>

          <div className="pn-media">
            {/* A background image and not an `<img>`: with no image element
                there is no hit target for the WebView's long-press menu to
                offer, the same reasoning the testimonial and step-13 assets
                already use. */}
            <div className="pn-photo" role="img" aria-label="Il volto della tua anima gemella, ancora nascosto" />
            <span className="pn-lock" aria-hidden="true">🔒</span>
          </div>
        </div>

        <div className="pn-bandwrap">
          <div className="pn-band">
            <span className="pn-speaker" aria-hidden="true">
              <span className="pn-sring" />
              <span className="pn-sring pn-sring2" />
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="#FFFFFF" />
                <path d="m15.5 9.5 5 5m0-5-5 5" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" />
              </svg>
            </span>

            <p className="pn-bandtext">
              Ferma il video al volo e torna qui…
              <br />
              <b>per fare il test. La tua sessione è già al sicuro!</b>
            </p>
          </div>
        </div>

        <div className="pn-foot">
          <button type="button" className="pn-cta" onClick={() => setPointing(true)}>
            <span className="pn-glow" aria-hidden="true" />
            <span className="pn-cta-label">PAUSA IL VIDEO E TORNA PER SCOPRIRE</span>
          </button>

          <p className="pn-tease">
            <span className="pn-emoji" aria-hidden="true">😱</span> Il suo volto potrebbe sorprenderti…
          </p>
        </div>
      </div>

      {/* Rendered after the card so it paints above it, and kept in the tree
          rather than mounted on tap: a element that appears from nothing has no
          starting style to transition from. `visibility` keeps it out of the
          accessibility tree until it is actually shown. */}
      <div className="pn-callout" role="status">
        <p className="pn-ctext">
          Fai tap sulla <b>X</b> metti in pausa il video e torna indietro per immergerti
          completamente.
        </p>
        <p className="pn-ctext">
          <span className="pn-emoji" aria-hidden="true">🔓</span> La tua sessione attuale è già al sicuro!
        </p>
      </div>
    </div>
  );
}
