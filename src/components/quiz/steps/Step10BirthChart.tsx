'use client';
import type { ReactNode } from 'react';
import { SIGN_BY_NAME, ZODIAC_SIGNS } from '@/data/quizData';
import { useStagedReveal } from '@/hooks/useStagedReveal';

interface Props {
  zodiac: string;
  onContinue: () => void;
  progressPct: number;
}

/** The original spins the loader for 1.8s before the chart resolves. */
const REVEAL = [1800] as const;

/** The original staggers each `.bcr-rise` child by 120ms. */
const rise = (i: number) => ({ animationDelay: `${i * 0.12}s` });

function Chip({ bg, color, icon, children }: { bg: string; color: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="bcr-chip">
      <span className="bcr-ic" style={{ background: bg, color }}>{icon}</span>
      <div className="bcr-t">{children}</div>
    </div>
  );
}

export function Step10BirthChart({ zodiac, onContinue, progressPct }: Props) {
  const stage = useStagedReveal(REVEAL);
  const sign = SIGN_BY_NAME.get(zodiac) ?? ZODIAC_SIGNS[8]; // Virgo, same fallback as the original

  return (
    <div className="bcr-wrap">
      <div className="bcr-pbc">
        <div className="bcr-pbg">
          <div className="bcr-pf" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="bcr-sc">
        {stage === 0 ? (
          <div className="bcr-load">
            <div className="bcr-ring" />
            <p>Sto leggendo la tua carta natale...</p>
          </div>
        ) : (
          <div>
            <p className="bcr-eyebrow bcr-rise" style={rise(0)}>
              ✦ Cosa rivela la tua carta natale
            </p>

            <div className="bcr-hero bcr-rise" style={rise(1)}>
              <div className="bcr-orbit" />
              <div className="bcr-glyph">{sign.emoji}</div>
              <div className="bcr-name">{sign.name}</div>
              <div className="bcr-meta">{sign.element} · {sign.dates}</div>
            </div>

            <div className="bcr-chips bcr-rise" style={rise(2)}>
              <Chip
                bg="#f1e7fb"
                color="#7c3aed"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" /></svg>}
              >
                <b>Sole in {sign.name}</b> — {sign.trait}.
              </Chip>
              <Chip
                bg="#fbe7f0"
                color="#c2407a"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" /></svg>}
              >
                <b>Venere è attiva</b> — sei attratta da {sign.match}.
              </Chip>
              <Chip
                bg="#e9e2fb"
                color="#5b2e9e"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a4 4 0 100 8c2 0 3-2 6-4s4-4 6-4a4 4 0 110 8c-2 0-3-2-6-4S8 8 6 8z" /></svg>}
              >
                <b>7ª Casa illuminata</b> — un legame d’anima si sta già formando.
              </Chip>
            </div>

            <p className="bcr-promise bcr-rise" style={rise(3)}>
              La tua carta mi dice una cosa rara: l’allineamento per incontrare la tua anima
              gemella si sta aprendo proprio ora. Con questo, <b>posso finalmente visualizzare il suo volto.</b>
            </p>

            <button className="bcr-cta bcr-rise" style={rise(4)} onClick={onContinue} type="button">
              Continua
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
