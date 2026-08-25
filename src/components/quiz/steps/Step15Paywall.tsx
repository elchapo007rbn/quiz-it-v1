'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { VTURB_PLAYER_SRC } from '../VturbPreload';
import { readSession, writeSession, gateRemaining } from '@/lib/session';
import { readVturbSeconds } from '@/lib/vturbTime';
import { trackFunnelEvent } from '@/lib/tracking';
import {
  FAQ_ITEMS,
  PAYWALL_BENEFITS,
  PAYWALL_CAROUSEL,
  PAYWALL_ROWS,
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
function Cta({ onClick, style }: { onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button className="pw-cta" onClick={onClick} type="button" style={style}>
      {CTA_LABEL}
    </button>
  );
}

export function Step15Paywall({ name, zodiac, interest, onCheckout }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60);
  const [viewers, setViewers] = useState(127);
  const [slide, setSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const scrollToUnlock = () => {
    document.getElementById('pwUnlock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pw-wrap">
      {/* ── VSL HERO ─────────────────────────────────────────── */}
      <div className="pw-vsl-hero">
        <div style={{ textAlign: 'center' }}>
          <span className="pw-vsl-kicker">✨ La tua lettura personale è pronta</span>
          <h1 className="pw-vsl-title">
            La Lettura della Tua Anima Gemella<br /><em>È Pronta per Essere Svelata</em>
          </h1>
          <p className="pw-vsl-sub">Guarda il video qui sotto e scopri la tua strada verso l’amore vero</p>
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
          </div>
        </div>
      </div>

      {/* ── GATED ────────────────────────────────────────────── */}
      <div className={`pw-gated${revealed ? ' pw-visible' : ''}`}>
        {/* HERO */}
        <div className="pw-hero">
          <div className="pw-ct">
            <h1 className="pw-hero-title">La Rivelazione della Tua Anima Gemella <em>È Pronta!</em></h1>
            <p className="pw-hero-sub">
              <b>ECCO L’ANTEPRIMA DELLA TUA ANIMA GEMELLA</b> — canalizzata dagli allineamenti
              planetari della tua carta natale <span>{sign.name}</span>. Un primo sguardo alla
              persona che le stelle hanno scritto nel tuo destino.
            </p>
            <ul className="pw-hb">
              <li><span className="pw-chk">✓</span> Iniziali dell’anima gemella: <span className="pw-mask">••••••</span></li>
              <li><span className="pw-chk">✓</span> Data dell’incontro: <span className="pw-mask">••/••/2026</span></li>
              <li><span className="pw-chk">✓</span> Tipo di legame: <span>Profondo e magnetico</span></li>
              <li><span className="pw-chk">✓</span> Tratto speciale: <span>Una bellezza ammirevole</span></li>
            </ul>
            <button className="pw-cta" onClick={scrollToUnlock} type="button">{CTA_LABEL}</button>
            <div className="pw-safe"><span>🛡️ Consegna immediata</span><span>🔒 Pagamento sicuro</span></div>
          </div>
        </div>

        {/* SKETCH */}
        <div className="pw-ct">
          <div className="pw-sketch">
            <div className="pw-sketch-frame">
              <div className="pw-media-placeholder">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} className="pw-soulmate-img" alt="Anteprima dell’anima gemella" />
              </div>
              {/* The female portrait ships with a lock baked in; only overlay one otherwise. */}
              {interest !== 'female' && <div className="pw-sketch-lock">🔒</div>}
            </div>
            <div className="pw-trait-row">
              <div className="pw-trait">
                <p className="pw-label">Carta natale</p>
                <p className="pw-value">{sign.name}</p>
              </div>
              <div className="pw-trait">
                <p className="pw-label">Tipo di lettura</p>
                <p className="pw-value">Carta di Sinastria</p>
              </div>
            </div>
            <div className="pw-sketch-reveal">
              <p className="pw-rl">Anteprima della tua anima gemella</p>
              <p className="pw-rv">
                Questa lettura si basa sulla tua carta natale <span>{sign.name}</span> e rivela
                gli allineamenti planetari che indicano l’identità della tua anima gemella e il
                momento del vostro incontro.
              </p>
              <p className="pw-rl" style={{ marginTop: 8 }}>Cosa rivelano le stelle</p>
              <p className="pw-blur">
                Dietro queste posizioni planetarie c’è una storia di amore profondo, di
                appartenenza e del legame che stavi aspettando. La lettura svela indizi su un
                incontro che può cambiarti la vita, già nelle prossime settimane.
              </p>
            </div>
          </div>
        </div>

        {/* LOCKED LIST + PRICE */}
        <div className="pw-sec" id="pwUnlock">
          <div className="pw-ct">
            <div className="pw-sec-head">
              <span className="pw-sec-eye">Cosa contiene la tua lettura</span>
              <h2 className="pw-sec-title">Sei rivelazioni <em>già decodificate</em> per te</h2>
              <p className="pw-sec-sub">
                Il profilo astrologico completo della tua anima gemella è pronto — sbloccalo qui sotto per vedere tutto.
              </p>
            </div>

            <div className="pw-ll">
              {PAYWALL_ROWS.map(row => (
                <div className="pw-li" key={row.k}>
                  <div className="pw-li-chk">✓</div>
                  <div className="pw-li-body">
                    <p className="pw-li-k">{row.k}</p>
                    <p className={`pw-li-v${row.locked ? ' pw-mask' : ''}`}>{row.v}</p>
                  </div>
                  <span className="pw-li-pill">{row.locked ? '🔒 Bloccato' : '👁 Anteprima'}</span>
                </div>
              ))}
            </div>

            <div className="pw-pc">
              <p className="pw-pc-eye">75% di sconto — il tuo sconto esclusivo</p>
              <p className="pw-pc-tag">
                Sblocca la tua Lettura completa della Carta Natale dell’Anima Gemella a un prezzo unico e speciale:
              </p>
              <div className="pw-pc-amount">
                <span className="pw-pc-cur">€</span><span className="pw-pc-num">9</span>
              </div>
              <p className="pw-pc-meta">
                <s>79€</s> <span className="pw-pc-save">Risparmi 60€ (75% di sconto)</span>
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
