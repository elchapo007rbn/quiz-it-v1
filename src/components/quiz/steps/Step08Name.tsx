'use client';
import { useEffect, useState } from 'react';
import { ChatBubble, ChatTyping, ChatUserMsg, ProgressBar } from '../Chat';
import { useStagedReveal } from '@/hooks/useStagedReveal';

interface Props {
  onSubmit: (name: string) => void;
  progressPct: number;
}

/** Intro typing → question → form. Matches the original's 1000ms reveal. */
const INTRO = [1000] as const;

export function Step08Name({ onSubmit, progressPct }: Props) {
  const [name, setName] = useState('');
  /** Name locked in by the user; drives the second half of the conversation. */
  const [sent, setSent] = useState<string | null>(null);
  const [replied, setReplied] = useState(false);
  const intro = useStagedReveal(INTRO);

  // Aura "types" for 1.1s before her reply lands.
  useEffect(() => {
    if (sent === null) return;
    const t = setTimeout(() => setReplied(true), 1100);
    return () => clearTimeout(t);
  }, [sent]);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) setSent(trimmed);
  };

  return (
    <div className="chat-wrap">
      <ProgressBar pct={progressPct} />
      <div className="chat-sc">
        {intro === 0 && <ChatTyping />}

        {intro > 0 && (
          <ChatBubble>
            Dimmi — <strong>come posso chiamarti?</strong>
          </ChatBubble>
        )}

        {intro > 0 && sent === null && (
          <div className="chat-form">
            <p className="chat-hint">Scrivi il tuo nome per iniziare ✨</p>
            <input
              type="text"
              placeholder="Il tuo nome"
              autoComplete="given-name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              // No `autoFocus` — same reasoning as step 14. Here it was the
              // worse offender of the two: the field only appears after a 1s
              // staged reveal, so the keyboard shot up a full second after the
              // step had settled, with nothing the user did to summon it.
              maxLength={30}
            />
            <button className="chat-cta" onClick={submit} type="button">
              Inizia la mia lettura
            </button>
          </div>
        )}

        {sent !== null && <ChatUserMsg text={sent} />}
        {sent !== null && !replied && <ChatTyping />}

        {replied && sent !== null && (
          <>
            <ChatBubble>
              È un vero piacere conoscerti, {sent}. ✨ Sento già una{' '}
              <strong>connessione speciale che si forma attorno a te</strong>. Sei pronta a
              scoprire <strong>l’anima gemella che l’universo sta preparando per te?</strong>
            </ChatBubble>
            <button
              className="chat-cta"
              style={{ maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}
              onClick={() => onSubmit(sent)}
              type="button"
            >
              Sì, sono pronta ✨
            </button>
          </>
        )}
      </div>
    </div>
  );
}
