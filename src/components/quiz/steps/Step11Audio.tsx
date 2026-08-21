'use client';
import { useRef, useState } from 'react';
import { AURA_AVATAR } from '@/data/quizData';
import { useStagedReveal } from '@/hooks/useStagedReveal';

interface Props {
  onContinue: () => void;
  progressPct: number;
}

/** Original timer chain: message → "recording" → audio card → CTA. */
const SEQUENCE = [1500, 2000, 5000, 5500] as const;

const fmt = (t: number) => {
  if (!Number.isFinite(t)) return '00:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// eslint-disable-next-line @next/next/no-img-element
const Avatar = () => <img src={AURA_AVATAR} alt="Maestra Aura" />;

export function Step11Audio({ onContinue, progressPct }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [dead, setDead] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const stage = useStagedReveal(SEQUENCE);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setDead(true));
    }
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="vm-wrap">
      <div className="vm-pbc">
        <div className="vm-pbg">
          <div className="vm-pf" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="vm-sc">
        {stage === 0 && (
          <div className="vm-typing">
            <Avatar />
            <div className="vm-dots"><span /><span /><span /></div>
          </div>
        )}

        {stage > 0 && (
          <div className="vm-bubble">
            <Avatar />
            <div className="vm-txt">
              <strong>I risultati della tua carta natale mi hanno sorpresa!</strong> Ti mando
              un breve audio in cui ti parlo del tuo destino in amore.
            </div>
          </div>
        )}

        {stage > 1 && stage < 3 && (
          <div className="vm-bubble">
            <Avatar />
            <div className="vm-txt">
              <div className="vm-rec">
                <span className="vm-mic">🎙️</span>
                <span className="vm-lbl">Maestra Aura sta registrando un audio...</span>
              </div>
            </div>
          </div>
        )}

        {stage > 2 && (
          <div className="vm-audiocard">
            <div className="vm-arow">
              <Avatar />
              <button
                className={`vm-playbtn${dead ? ' vm-dead' : ''}`}
                onClick={toggle}
                type="button"
                aria-label={playing ? 'Pausa' : 'Riproduci'}
              >
                {playing ? '⏸' : '▶'}
              </button>
              <div className="vm-atrack">
                <div className="vm-atimes">
                  <span>{fmt(current)}</span>
                  <span>{fmt(duration)}</span>
                </div>
                <div className="vm-abar">
                  <div className="vm-afill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            {/* Matched to the step 0 and step 3 players, which are the two that
                do render inside TikTok's in-app browser. This one differed from
                them in exactly two ways and rendered nothing on either iPhone or
                Android:

                `preload="auto"`. Without it WebKit defers fetching media data,
                and a muted autoplay that never gets data never paints a frame —
                the flat lilac the reader saw is this element's own CSS
                background showing through an empty video box.

                A second `<source>`. WebM/VP9 decodes on the devices tested, so
                the MP4 is not the primary path; it is the fallback the other two
                players already carry and this one was missing, which also gives
                the browser a second chance when the first source stalls.

                `<video>` carries no `alt`, so the label moves to `aria-label`. */}
            <video
              className="vm-avid"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-label="Anteprima della lettura"
            >
              <source src="/images/gif01.webm" type="video/webm" />
              <source src="/images/gif01.mp4" type="video/mp4" />
            </video>

            <audio
              ref={audioRef}
              src="/audio-quiz-it.m4a"
              preload="metadata"
              onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
              onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
              onEnded={() => setPlaying(false)}
              onError={() => setDead(true)}
            />

            {dead && (
              <p className="vm-asset-err">L’audio si sta caricando — puoi comunque proseguire.</p>
            )}
          </div>
        )}

        {stage > 3 && (
          <button className="vm-cta" onClick={onContinue} type="button">
            Vai subito alla rivelazione completa
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
