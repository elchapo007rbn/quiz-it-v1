'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { VTURB_PLAYER_SRC } from '../VturbPreload';
import { readSession, writeSession, gateRemaining } from '@/lib/session';
import { readVturbSeconds } from '@/lib/vturbTime';
import { RevealTimer } from './RevealTimer';
import { PressMarquee } from '@/components/quiz/PressMarquee';
import { trackFunnelEvent } from '@/lib/tracking';
import {
  FAQ_ITEMS,
  PAYWALL_ROWS,
  PAYWALL_BENEFITS,
  PAYWALL_CAROUSEL,
  SIGN_BY_NAME,
  SOULMATE_PREVIEW,
  ZODIAC_SIGNS,
} from '@/data/quizData';

interface Props {
  name: string;
  zodiac: string;
  interest?: 'male' | 'female' | 'both';
  onCheckout: () => void;
}

/** Seconds of VSL watched before the offer unlocks — 03:48 in the original. */
const REVEAL_AT = 228;

/**
 * The element the player upgrades. The id encodes the player configuration the
 * account issues; the loader that reads it is VTURB_PLAYER_SRC, which lives in
 * VturbPreload beside the warm-up that puts it in cache from step 13.
 */
const PLAYER_ELEMENT_ID = 'vid-6a8c3ef348dab67a9e65468a';

/**
 * ⚠️ DEVELOPMENT-ONLY: opens the gated offer block immediately so it can be
 * styled and reviewed without sitting through 3:48 of VSL. The bundler folds
 * this to `false` in `next build`, so production keeps the full REVEAL_AT gate
 * untouched. Delete this constant and its use below to restore the shipping
 * default — see the dev-nav cleanup note; same rule applies.
 */
const SKIP_GATE_IN_DEV = process.env.NODE_ENV === 'development';

/**
 * ⚠️ DEVELOPMENT-ONLY: draws a flat box where the VSL goes instead of loading
 * the Vturb player.
 *
 * Reviewing this step meant loading the player on every reload, which spends a
 * view on the vendor's account for nothing and leaves watch progress behind
 * that makes the next reload open on its "continue or restart?" dialog instead
 * of the page. It also owns its own inline style, which a React re-render can
 * stomp - the collapsed-video bug this box exists to stop happening again.
 *
 * `process.env.NODE_ENV` is inlined by the bundler, so in `next build` this is
 * the literal `false` and the whole placeholder branch is dropped from the
 * output. There is no flag, no env var and no query parameter that can turn the
 * VSL off in production - the only build that can render this box is one
 * started by `next dev`.
 *
 * Clicking the box loads the real player, for when the player itself is what
 * you came to look at. Delete this constant, its use below and `.pw-vsl-stub`
 * to restore the shipping default - same rule as the dev-nav cleanup note.
 */
const VSL_STUB_IN_DEV = process.env.NODE_ENV === 'development';

const CTA_LABEL = '✨ SBLOCCA LA MIA RIVELAZIONE COMPLETA! →';

const COMPAT_BARS = [
  { label: 'Amore', value: 92, cls: 'pw-love' },
  { label: 'Comunic.', value: 78, cls: 'pw-comm' },
  { label: 'Fiducia', value: 85, cls: 'pw-trust' },
  { label: 'Matrimonio', value: 88, cls: 'pw-mar' },
] as const;

const mmss = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

/** Declared at module scope so React keeps one identity across renders. */
function Cta({
  onClick,
  style,
  label = CTA_LABEL,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
  label?: string;
}) {
  return (
    <button className="pw-cta" onClick={onClick} type="button" style={style}>
      {label}
    </button>
  );
}

export function Step15Paywall({ name, zodiac, interest, onCheckout }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60);
  const [viewers, setViewers] = useState(127);
  const [slide, setSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  /** Dev only: the stub was clicked, so mount the real player after all. */
  const [stubDismissed, setStubDismissed] = useState(false);

  // Index-based fallback: a name lookup would break the moment the signs are
  // relabelled, and the `!` would turn that into a runtime crash.
  const sign = SIGN_BY_NAME.get(zodiac) ?? ZODIAC_SIGNS[3]; // Ariete
  const displayName = name.trim() || 'Tu';
  // "Both" has no dedicated portrait in the original — it falls back to male.
  const preview = interest === 'female' ? SOULMATE_PREVIEW.female : SOULMATE_PREVIEW.male;

  /**
   * EndQuiz: the offer was reached, with nothing asked of the reader.
   *
   * On mount rather than on the email submit that used to carry it, matching
   * the producer, whose `handleStepChange` fires it on `C === "paywall"` — the
   * step type, not an action. That separates "saw the VSL" from "tried to buy",
   * and the latter is the `/click` hop in lib/checkout.ts.
   *
   * A restored session that lands straight on this step fires it too, which is
   * correct: the offer is on screen either way.
   */
  useEffect(() => {
    trackFunnelEvent('EndQuiz');
  }, []);

  /**
   * Opens the offer after REVEAL_AT seconds — minus whatever the reader already
   * watched on a previous visit.
   *
   * The old version restarted the full 3:48 on every arrival and remembered
   * nothing past a dismissed bottom sheet. Someone who had watched 3:20, closed
   * TikTok's sheet by accident and come back was made to wait the whole gate
   * again. That reader was the closest one to buying.
   *
   * Reads storage post-mount for the same hydration reason the old code did.
   */
  useEffect(() => {
    const saved = readSession();

    // ctaUnlocked and the dev skip open instantly — as a 0ms timeout rather
    // than a synchronous set, which is the same trick the pre-plan gate used
    // for its alreadyRevealed path.
    const instant = saved?.ctaUnlocked === true || SKIP_GATE_IN_DEV;
    const wait = instant ? 0 : gateRemaining(REVEAL_AT, saved?.videoWatched ?? 0);

    const t = setTimeout(() => {
      // The dev skip must stay out of the blob; a session already unlocked
      // has nothing to write.
      if (!instant) writeSession({ ctaUnlocked: true });
      setRevealed(true);
    }, wait * 1000);

    return () => clearTimeout(t);
  }, []);

  /**
   * Keeps `videoWatched` current while the VSL plays.
   *
   * Persisted as the furthest point reached rather than the live position: the
   * player lets the reader scrub, and rewinding to re-hear a line should not
   * take back credit already earned toward the gate.
   *
   * Five seconds between writes, per the spec. The player is polled rather than
   * subscribed to because its `onTime` hook did not fire with a plain callback
   * when tested against the live instance, and a poll cannot go stale if the
   * vendor changes that hook's signature.
   */
  useEffect(() => {
    const id = setInterval(() => {
      const seconds = readVturbSeconds();
      if (seconds === null) return;

      // Update an existing session only — never create one. The checkout CTA
      // clears the blob and then navigates, and this interval survives into
      // that window: one more tick with the video still playing was observed
      // resurrecting the blob from a null read. A watch position with no
      // funnel context is worthless, so a missing session means stop, not
      // start over.
      const saved = readSession();
      if (saved === null) return;
      if (seconds > saved.videoWatched) {
        writeSession({ videoWatched: seconds });
      }
    }, 5000);

    return () => clearInterval(id);
  }, []);

  // Escape hatch the original ships too, for QA without sitting through the VSL.
  useEffect(() => {
    (window as unknown as { revealNow: () => void }).revealNow = () => {
      writeSession({ ctaUnlocked: true });
      setRevealed(true);
    };
  }, []);

  // Timers below only run once the gated block is on screen.
  useEffect(() => {
    if (!revealed) return;
    const t = setInterval(() => setCountdown(c => (c <= 0 ? 9 * 60 + 59 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [revealed]);

  useEffect(() => {
    if (!revealed) return;
    const t = setInterval(() => {
      setViewers(n => Math.max(92, Math.min(218, n + Math.floor(Math.random() * 7) - 3)));
    }, 3200);
    return () => clearInterval(t);
  }, [revealed]);

  useEffect(() => {
    if (!revealed) return;
    const t = setInterval(() => setSlide(s => (s + 1) % PAYWALL_CAROUSEL.length), 4000);
    return () => clearInterval(t);
  }, [revealed]);

  return (
    <div className="pw-wrap">
      {/* ── VSL HERO ─────────────────────────────────────────── */}
      <div className="pw-vsl-hero">
        <div style={{ textAlign: 'center' }}>
          <RevealTimer revealAt={REVEAL_AT} done={revealed} />
          <h1 className="pw-vsl-title">
            <em>Il volto della tua anima gemella</em> ti sarà rivelato alla fine di questo breve video
          </h1>
          <p className="pw-vsl-sub">Guarda il video fino alla fine, c’è qualcosa che le impedisce di arrivare da te…</p>
          {/* Vturb embed, 1:1 — the same ratio the local vsl.mp4 and the Panda
              iframe before it rendered at, so the block keeps its exact height.
              Unlike that iframe, the ratio box is the vendor's own placeholder
              div: it is inside the custom element the player script upgrades,
              so replacing it with our own would take the element's first child
              out from under it. .pw-vsl-player-wrap therefore only carries the
              rounding, the shadow and the cover frame — see globals.css.

              Nothing here mirrors the player's state. The Panda embed needed a
              `playerReady` flag and a postMessage listener because a
              cross-origin iframe paints its own empty background over the cover
              long before it has a frame to show. This player runs in our own
              document and manages that handoff itself.

              REVEAL_AT is unchanged and still enforced by the `setTimeout`
              above, and that timeout is still a page-time timeout — it does not
              watch the player. What changed is its duration: the wait is now
              REVEAL_AT minus whatever watch time was credited from a previous
              visit, so a returning reader is never made to sit out the gate
              again. */}
          <div className="pw-vsl-player-wrap">
            {VSL_STUB_IN_DEV && !stubDismissed ? (
              <button
                type="button"
                className="pw-vsl-stub"
                onClick={() => setStubDismissed(true)}
              >
                blocco VSL — solo in dev
                <small>tocca per caricare il player</small>
              </button>
            ) : (
              <>
            <vturb-smartplayer
              id={PLAYER_ELEMENT_ID}
              style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: 400 }}
            >
              {/* The vendor's placeholder. It owns the 1:1 box, and that is the
                  reason it is kept. Its inline `background-color: black` is the
                  one thing dropped: an inline style outranks the stylesheet, so
                  black here would hide the cover frame .pw-vsl-player-wrap
                  paints — the flat-black gap this funnel already went to some
                  trouble to close. Black survives as the fallback under that
                  background, so nothing is lost while the image loads. */}
              <div
                className="vturb-player-placeholder"
                style={{ position: 'relative', width: '100%', padding: '100% 0 0', zIndex: 0 }}
              />
            </vturb-smartplayer>
            {/* The vendor snippet appends this to `<head>` from an inline
                script. `afterInteractive` is the same timing without the inline
                block, and it dedupes if the step ever remounts. VturbPreload has
                already put the file in cache from step 13. */}
            <Script src={VTURB_PLAYER_SRC} strategy="afterInteractive" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── GATED ────────────────────────────────────────────── */}
      <div className={`pw-gated${revealed ? ' pw-visible' : ''}`}>
        {/* The first thing under the video is the buy button, which is where
            the V2 layout puts it. What stood here was a second hero - its own
            H1, a four-line teaser and a CTA that only scrolled to the price
            block further down. The reader had already watched 3:48 to get
            here; asking her to read another headline and then scroll to find
            the offer is two steps between her and the checkout.

            Inside `.pw-gated`, so it appears when the gate opens and not
            before. REVEAL_AT is untouched.

            `onCheckout` is goToCheckout, whose redirector hop is what fills
            the Checkout column in the dashboard - already wired, already
            counting, and it ignores a second tap. */}
        <div className="pw-ct">
          <Cta onClick={onCheckout} label="Ottieni lo schizzo" />
        </div>

        {/* Ported from the /dev/paywall-v2 draft. The portrait follows the same
            rule the sketch further down already follows - the reader's answer
            on step 2 picks the face - so `preview` is reused rather than
            recomputed, and the two blocks can never disagree about who she is
            waiting for. */}
        <div className="pw-ct">
          <div className="pw-acct">
            <h2 className="pw-acct-h2">Il tuo schizzo è pronto!</h2>
            <p className="pw-acct-sub">Vedi la tua anima gemella oggi!</p>
            {/* The 1.42:1 card from the reference: the portrait holds the
                left 54%, a masked panel of blurred copy dissolves into it from
                the right, and the caption is a bar inside the frame rather
                than a line under it. The whole thing is the width of the video
                and the CTA above it. */}
            <div className="pw-acct-draw">
              <div className="pw-acct-draw-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Il disegno della tua anima gemella" />
              </div>

              {/* Decorative: blurred past reading, and announced to nobody. A
                  screen reader would otherwise read out three paragraphs the
                  page is deliberately withholding. */}
              <div className="pw-acct-draw-panel" aria-hidden="true">
                <div className="pw-acct-draw-copy">
                  <h3>La tua anima gemella</h3>
                  <p>
                    All’interno troverai uno schizzo curato nei minimi dettagli della tua
                    anima gemella, insieme alla storia di dove e come vi incontrerete.
                  </p>
                  <p>
                    Il tuo Segno Zodiacale rivela il tuo carisma esteriore, mentre il tuo
                    Segno di Venere svela i tuoi desideri più profondi in amore.
                  </p>
                  <p>Preparati a scoprire i dettagli della storia d’amore che ti aspetta.</p>
                </div>
              </div>

              <div className="pw-acct-draw-veil" aria-hidden="true" />

              {/* Centred on the whole frame rather than on the portrait half,
                  so it lines up with the caption below it. */}
              {/* A heart, not a second padlock. The bar at the foot of this
                  same frame already carries one, and two locks in one 228px
                  box say the same thing twice. This one is drawn rather than
                  the emoji it replaced, for the reason the caption's padlock
                  is drawn: every OS redraws that glyph its own way. */}
              <div className="pw-acct-lock">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 20.4s-7.5-4.6-7.5-9.7a4.35 4.35 0 0 1 7.5-2.95 4.35 4.35 0 0 1 7.5 2.95c0 5.1-7.5 9.7-7.5 9.7Z"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <p className="pw-acct-cap">
                <svg className="pw-acct-cap-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1.7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.6 7V5.1a2.4 2.4 0 0 1 4.8 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Bloccato finché non riscatti la tua lettura
              </p>
            </div>

            <ul className="pw-acct-proof">
              <li>
                <span className="pw-acct-proof-ico">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M3.5 18.6a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M16.2 5.3a3.2 3.2 0 0 1 0 5.4M17.6 14.2a5.5 5.5 0 0 1 3 4.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </span>
                <span><b>900+ utenti</b> hanno visto la loro anima gemella oggi.</span>
              </li>
              <li>
                <span className="pw-acct-proof-ico">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M20.2 12.2a7.6 7.6 0 0 1-11 6.8l-4.7 1.4 1.4-4.5a7.6 7.6 0 1 1 14.3-3.7Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Scelto da oltre <b>74.000</b> persone.</span>
              </li>
            </ul>

            {/* The same strip the landing carries, from the same component. */}
            <PressMarquee />
          </div>
        </div>

        {/* LOCKED LIST + PRICE */}
        <div className="pw-sec" id="pwUnlock">
          <div className="pw-ct">
            {/* One card, not two stacked: the six rows and the price are the
                same offer, and a rule between them says that better than a gap
                between two surfaces. */}
            <div className="pw-block">
            <div className="pw-sec-head">
              <span className="pw-sec-eye">Decodificato dalla tua carta</span>
              <h2 className="pw-sec-title">La Tua Lettura <em>Rivelerà:</em></h2>
              <p className="pw-sec-sub">Due sono già aperte. Le altre quattro a un tocco.</p>
            </div>

            <div className="pw-rev">
              {PAYWALL_ROWS.map(row => (
                <div className="pw-rv" key={row.k}>
                  <div className="pw-rv-b">
                    <p className="pw-rv-k">{row.k}</p>
                    <p className={`pw-rv-v${row.locked ? ' pw-rv-blur' : ''}`}>{row.v}</p>
                  </div>
                  <span className={`pw-rv-pill${row.locked ? '' : ' pw-rv-prev'}`}>
                    {row.locked ? '🔒 Bloccato' : '👁 Anteprima'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pw-div" />

            <div className="pw-pc">
              <p className="pw-pc-tag">Sblocca tutte e sei le rivelazioni:</p>
              <div className="pw-pc-amount">
                <span className="pw-pc-cur">€</span><span className="pw-pc-num">9</span>
              </div>
              {/* 29€ rather than the 79€ this anchored against before, matching
                  the monthly price the legal line below already names: the full
                  price is what the plan renews at, and the 9€ is the first
                  month. The percentage came out of both this line and the
                  eyebrow above because 29 to 9 is 69%, not the 75% they
                  claimed. */}
              <p className="pw-pc-meta">
                <s>29€</s> <span className="pw-pc-save">Risparmi 20€ oggi</span>
              </p>
              <p style={{ fontSize: 13, color: 'var(--bk3)', fontWeight: 600, margin: '0 0 12px' }}>
                Accesso immediato tramite l’App Auraly (iOS e Android)
              </p>
              <Cta onClick={onCheckout} />
              <div className="pw-safe"><span>🛡️ Pagamento protetto</span><span>🔒 Crittografia SSL</span></div>
              <div className="pw-pay-logos">
                <span className="pw-pay-logo" style={{ color: '#1A1F71' }}>VISA</span>
                <span className="pw-pay-logo" style={{ color: '#EB001B' }}>MC</span>
                <span className="pw-pay-logo" style={{ color: '#2E77BC' }}>AMEX</span>
                <span className="pw-pay-logo">DISC</span>
                <span className="pw-pay-logo" style={{ color: '#003087' }}>PayPal</span>
              </div>
              <p style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 1.4 }}>
                Cliccando sul pulsante qui sopra, accetti l’addebito di 9€ oggi per l’accesso
                immediato alla tua Lettura della Carta Natale dell’Anima Gemella. Al termine dei
                30 giorni introduttivi, il piano si rinnova automaticamente a 29€ al mese. Puoi
                disdire quando vuoi prima del rinnovo dalle impostazioni del tuo account o
                contattando l’assistenza. Non sono previsti rimborsi per periodi di fatturazione
                parziali dopo la finestra di garanzia di 7 giorni.
              </p>
            </div>
            </div>
          </div>
        </div>

        {/* BENEFITS */}
        <div className="pw-sec" style={{ background: '#fff' }}>
          <div className="pw-ct">
            <div className="pw-sec-head">
              <span className="pw-sec-eye">Incluso nella tua lettura</span>
              <h2 className="pw-sec-title">Ecco <em>cosa ricevi</em></h2>
            </div>
            {PAYWALL_BENEFITS.map(b => (
              <div className="pw-ben" key={b.title}>
                <div className="pw-ben-icon">{b.icon}</div>
                <div>
                  <h3>{b.title}</h3>
                  <p>{b.text.replace('{sign}', sign.name)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMPATIBILITY */}
        <div className="pw-sec">
          <div className="pw-ct">
            <div className="pw-sec-head">
              <span className="pw-sec-eye">Rivelato dalla tua carta</span>
              <h2 className="pw-sec-title">La tua compatibilità in amore <em>è stata rilevata!</em></h2>
            </div>

            <div className="pw-compat">
              <div className="pw-compat-head">
                <div className="pw-compat-timer">⏱ <span>{mmss(countdown)}</span></div>
                <div className="pw-compat-pill">Ricevi la previsione personale</div>
              </div>
              <p className="pw-compat-match">Avete un match</p>

              <div className="pw-compat-signs">
                <div className="pw-sign">
                  <div className="pw-glyph">{sign.emoji}</div>
                  <p className="pw-name">{sign.name}</p>
                  <p className="pw-el">Il tuo segno</p>
                </div>
                <div className="pw-compat-center">92%<small>Affinità</small></div>
                <div className="pw-sign">
                  <div className="pw-glyph">❓</div>
                  <p className="pw-name pw-masked">•••••</p>
                  <p className="pw-el">≋ Nascosto</p>
                </div>
              </div>

              <div className="pw-compat-bars">
                {COMPAT_BARS.map(bar => (
                  <div className="pw-bar-row" key={bar.label}>
                    <span className="pw-blabel">{bar.label}</span>
                    <div className="pw-bar-track">
                      <div className={`pw-bar-fill ${bar.cls}`} />
                    </div>
                    <span className="pw-bval">{bar.value}%</span>
                  </div>
                ))}
              </div>

              <Cta onClick={onCheckout} style={{ marginTop: 18 }} />
            </div>

            {/* DEMAND */}
            <div className="pw-demand">
              <div className="pw-demand-head">
                <div className="pw-demand-icon">🔥</div>
                <div>
                  <p className="pw-demand-title">Richiesta altissima — letture giornaliere limitate</p>
                  <p className="pw-demand-sub">
                    Aura Solenne prepara solo un numero limitato di letture al giorno.
                  </p>
                </div>
              </div>
              <div className="pw-demand-meter-top">
                <span>🔒 restano <b>3</b> posti oggi</span>
                <span><span className="pw-live-dot" /><b>{viewers}</b> la stanno guardando</span>
              </div>
              <div className="pw-demand-track"><div className="pw-demand-fill" /></div>
              <p className="pw-demand-meta">
                <b>87%</b> delle letture di oggi è già stato richiesto · <b>Non perdere il tuo posto.</b>
              </p>
            </div>
          </div>
        </div>

        {/* TESTIMONIAL CAROUSEL */}
        <div className="pw-sec" style={{ background: '#fff' }}>
          <div className="pw-ct">
            <div className="pw-sec-head">
              <span className="pw-sec-eye">Persone vere, amore vero</span>
              <h2 className="pw-sec-title">Letture che <em>sono diventate amore vero</em></h2>
            </div>

            <div style={{ overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  transition: 'transform .4s ease',
                  transform: `translateX(-${slide * 100}%)`,
                }}
              >
                {PAYWALL_CAROUSEL.map(src => (
                  <div key={src} style={{ minWidth: '100%', padding: '0 4px' }}>
                    <figure className="pw-fb-post">
                      <div className="pw-fb-img">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Testimonianza" />
                      </div>
                      <div className="pw-fb-tag">
                        <span>✓ Anima gemella verificata</span>
                        <span>Condiviso su Facebook</span>
                      </div>
                    </figure>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '12px 0' }}>
              {PAYWALL_CAROUSEL.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Testimonianza ${i + 1}`}
                  onClick={() => setSlide(i)}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', border: 0, padding: 0,
                    transition: 'background .3s',
                    background: i === slide ? '#6B21A8' : 'rgba(139,92,246,.2)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* GUARANTEE */}
        <div className="pw-ct">
          <div className="pw-guar">
            <div className="pw-guar-title">🛡️ Garanzia di rimborso totale entro 7 giorni</div>
            <div className="pw-guar-text">
              Se la lettura non ti rispecchia, scrivici entro 7 giorni e ti rimborsiamo tutto.
              Senza fare domande. Il rischio è tutto nostro.
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="pw-sec">
          <div className="pw-ct">
            <div className="pw-sec-head">
              <span className="pw-sec-eye">Domande frequenti</span>
              <h2 className="pw-sec-title">Le domande <em>più comuni</em></h2>
            </div>
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={item.q}
                className={`pw-fq${openFaq === i ? ' pw-open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="pw-fq-q">{item.q}</div>
                <div className="pw-fq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FINAL */}
        <div className="pw-final">
          <h2><span>{displayName}</span>, la tua lettura è <em>pronta per essere svelata.</em></h2>
          <p>Le stelle sono allineate. Sblocca ora la rivelazione completa della tua anima gemella.</p>
          <Cta onClick={onCheckout} />
          <div className="pw-final-trust">🛡️ 9€ oggi · Pagamento sicuro garantito</div>
        </div>

        {/* FOOTER */}
        <div className="pw-footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pw-footer-logo" src="/images/auraly-logo.png" alt="Auraly" />
          <p>© 2026 Auraly. Tutte le letture hanno finalità di intrattenimento e riflessione.</p>
          <p>
            <a href="https://web.auralyapp.com/managepayments" target="_blank" rel="noopener">Gestisci abbonamento</a> ·{' '}
            <a href="https://auralyapp.com/en/privacy-policy" target="_blank" rel="noopener">Privacy</a> ·{' '}
            <a href="https://auralyapp.com/en/terms-of-use" target="_blank" rel="noopener">Termini</a> ·{' '}
            <a href="mailto:contact@auralyapp.com">Contatta l’assistenza</a>
          </p>
        </div>
      </div>
    </div>
  );
}
