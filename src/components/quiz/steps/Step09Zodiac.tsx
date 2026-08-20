'use client';
import { useState } from 'react';
import { ZODIAC_SIGNS } from '@/data/quizData';
import { ChatBubble, ChatTyping, ProgressBar, ZodiacGlyph } from '../Chat';
import { useStagedReveal } from '@/hooks/useStagedReveal';

interface Props {
  onSelect: (sign: string) => void;
  progressPct: number;
}

const INTRO = [1600] as const;

export function Step09Zodiac({ onSelect, progressPct }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const intro = useStagedReveal(INTRO);

  // The original locks the grid, paints the selection, then advances after 180ms
  // so the highlight is visible before the step changes.
  const choose = (name: string) => {
    if (picked) return;
    setPicked(name);
    setTimeout(() => onSelect(name), 180);
  };

  return (
    <div className="chat-wrap">
      <ProgressBar pct={progressPct} />
      <div className="chat-sc">
        {intro === 0 && <ChatTyping />}

        {intro > 0 && (
          <>
            <ChatBubble>
              Ognuno di noi porta <strong>un’anima gemella scritta nelle stelle</strong> fin
              dal giorno in cui nasce. Dimmi il tuo segno, così posso{' '}
              <strong>leggere la tua carta e visualizzarla.</strong>
            </ChatBubble>

            <div className="zod-form">
              <label className="chat-big">Qual è il tuo segno zodiacale?</label>
              <div className="zod-grid">
                {ZODIAC_SIGNS.map(sign => (
                  <div
                    key={sign.name}
                    className={`zod-opt${picked === sign.name ? ' sel' : ''}`}
                    onClick={() => choose(sign.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') choose(sign.name); }}
                  >
                    <span className="em"><ZodiacGlyph sign={sign} /></span>
                    <div className="txt">
                      <div className="t">{sign.name}</div>
                      <div className="dt">{sign.dates}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
