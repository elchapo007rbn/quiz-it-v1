'use client';
import { useEffect, useState } from 'react';
import { AURA_AVATAR, SIGN_BY_NAME } from '@/data/quizData';
import { useStagedReveal } from '@/hooks/useStagedReveal';

interface Props {
  name: string;
  zodiac: string;
  onContinue: () => void;
  progressPct: number;
}

/** Original chain: message → revelation image → location card + CTA. */
const SEQUENCE = [1000, 1800, 2600] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * The original reads `quiz_birth_day`/`quiz_birth_month`, but this funnel
 * variant never writes them — they're orphan keys. We derive the date from
 * the first day of the chosen sign's range instead.
 *
 * Reads the sign's numeric `startDay`/`startMonth` rather than parsing the
 * human-readable `dates` string, so localising that label can never break
 * what gets written onto the card.
 */
function birthDateFromSign(zodiac: string): string {
  const sign = SIGN_BY_NAME.get(zodiac);
  if (!sign) return '01/01';
  return `${pad2(sign.startDay)}/${pad2(sign.startMonth)}`;
}

const PROVIDERS = [
  { url: 'https://ipapi.co/json/', map: (d: Record<string, unknown>) => ({ city: d.city, region: d.region }) },
  { url: 'https://ipwho.is/', map: (d: Record<string, unknown>) => (d.success === false ? null : { city: d.city, region: d.region }) },
  { url: 'https://get.geojs.io/v1/ip/geo.json', map: (d: Record<string, unknown>) => ({ city: d.city, region: d.region }) },
  { url: 'https://freeipapi.com/api/json', map: (d: Record<string, unknown>) => ({ city: d.cityName, region: d.regionName }) },
];

/** Walks the provider list until one returns a usable city; '' if none do. */
async function resolveCity(signal: AbortSignal): Promise<string> {
  for (const p of PROVIDERS) {
    // Leaving the step aborts mid-flight. Without this the loop would keep
    // walking the list, opening three more fetches that reject the instant they
    // see the aborted signal — four cancellations logged where one happened.
    if (signal.aborted) return '';
    try {
      const res = await fetch(p.url, { signal });
      if (!res.ok) continue;
      const mapped = p.map(await res.json());
      const city = mapped?.city;
      if (typeof city === 'string' && city && city.toLowerCase() !== 'unknown') {
        const region = typeof mapped?.region === 'string' ? mapped.region : '';
        return region ? `${city}, ${region}` : city;
      }
    } catch {
      /* try the next provider */
    }
  }
  return '';
}

export function Step13Revelation({ name, zodiac, onContinue, progressPct }: Props) {
  const stage = useStagedReveal(SEQUENCE);
  const [location, setLocation] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    // The original races lookup against a 3s cap so the step never stalls.
    const cap = setTimeout(() => ctrl.abort('lookup timed out'), 3000);
    let alive = true;
    resolveCity(ctrl.signal)
      .then(city => { if (alive) setLocation(city); })
      // resolveCity swallows per-provider failures and resolves to '' instead,
      // so nothing should land here — it is a backstop, and the step simply
      // renders without a city if it ever does.
      .catch(() => {})
      .finally(() => clearTimeout(cap));
    // A reason is passed so an abort surfacing anywhere reads as this teardown
    // rather than the bare "signal is aborted without reason".
    return () => { alive = false; clearTimeout(cap); ctrl.abort('step unmounted'); };
  }, []);

  return (
    <div className="lr-wrap">
      <div className="lr-pbc">
        <div className="lr-pbg">
          <div className="lr-pf" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="lr-sc">
        <div style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          {stage === 0 && (
            <div className="lr-typing">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AURA_AVATAR} alt="Maestra Aura" />
              <div className="lr-dots"><span /><span /><span /></div>
            </div>
          )}

          {stage > 0 && (
            <div className="lr-bubble">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="lr-avatar" src={AURA_AVATAR} alt="Maestra Aura" />
              <p>
                Sulla base della tua carta natale, sto preparando il ritratto della tua
                anima gemella. Inizio proprio ora 👇🔮
              </p>
            </div>
          )}

          {stage > 1 && (
            <div className="lr-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* Was a 2.04MB PNG — the format was the whole problem: PNG stores a
                  photograph losslessly, and this one carries no transparency
                  (rgb24) to justify it. Same pixels as WebP weigh 150KB, a 93%
                  cut at SSIM 0.985.

                  Resolution is deliberately unchanged at 1083x1452. It renders
                  at 380px wide, so a 3x screen would want 1392px — the file is
                  already below that, and shrinking it would cost sharpness on
                  the handwriting. It also must not be resampled at all: the
                  overlay is positioned in percentages over this image, so any
                  change in ratio would slide the text off the card. */}
              <img className="lr-bg" src="/images/carta-italia.webp" alt="Rivelazione" decoding="async" />
              <div className="lr-overlay">
                <span className="lr-line">Nome: <strong>{name || 'Il tuo nome'}</strong></span>
                <span className="lr-line">Data di nascita: <strong>{birthDateFromSign(zodiac)}</strong></span>
                <span className="lr-line">Segno zodiacale: <strong>{zodiac}</strong></span>
              </div>
            </div>
          )}

          {stage > 2 && (
            <>
              <div className="lr-location">
                <div className="lr-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={AURA_AVATAR} alt="Maestra Aura" />
                  <p>
                    {location ? (
                      <>
                        La tua carta natale indica che incontrerai la tua anima gemella
                        vicino a 📍<strong>{location}</strong>. Ho preparato una rivelazione
                        speciale per te: guardiamola subito. ✨
                      </>
                    ) : (
                      <>
                        La tua carta natale indica che incontrerai la tua anima gemella
                        molto vicino a <strong>dove ti trovi in questo momento</strong>. Ho
                        preparato una rivelazione speciale per te: guardiamola subito. ✨
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button className="lr-btn" onClick={onContinue} type="button">
                Scopri il volto della mia anima gemella
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
