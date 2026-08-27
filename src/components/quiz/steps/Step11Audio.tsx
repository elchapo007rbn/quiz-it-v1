'use client';
import { useEffect, useRef, useState } from 'react';
import { AURA_AVATAR } from '@/data/quizData';
import { useStagedReveal } from '@/hooks/useStagedReveal';
import { PauseGate } from '@/components/quiz/PauseGate';
import { isAndroidTikTok, isPauseNoticeForced } from '@/lib/pauseNotice';

interface Props {
  onContinue: () => void;
  progressPct: number;
}

/** Original timer chain: message → "recording" → audio card → CTA. */
const SEQUENCE = [1500, 2000, 5000, 5500] as const;

/** Matches `.pg-gate`'s `left` in globals.css; the beak is measured against it. */
const GATE_INSET = 16;

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
  const playRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [dead, setDead] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  /**
   * `none` — not an Android/TikTok reader, so no gate is rendered at all.
   * `armed` — the next play tap opens it instead of starting the audio.
   * `released` — answered. Still mounted so it can animate out, but inert.
   */
  const [gate, setGate] = useState<'none' | 'armed' | 'released'>('none');
  const [gateOpen, setGateOpen] = useState(false);
  const [originX, setOriginX] = useState(0);
  const stage = useStagedReveal(SEQUENCE);

  /**
   * The gate exists only where the collision does: Android, inside TikTok's
   * WebView. Read after mount, never during render — the funnel is prerendered
   * and a user-agent read while rendering would break hydration.
   */
  useEffect(() => {
    // `isPauseNoticeForced` also arms it in modo dev and behind `?pausa=1` on a
    // tunnel build, so the card can be reviewed without an Android device in
    // hand. The step-0 notice reads the same switch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount by design; see above.
    setGate(isAndroidTikTok() || isPauseNoticeForced() ? 'armed' : 'none');
  }, []);

  /**
   * Stops the message when she leaves the app mid-playback.
   *
   * She has 34 seconds of Aura and no way to scrub back. Letting it run into an
   * empty room costs her the half she came for, and unlike everything else in
   * this component that is not a guess about her intent: the page is hidden.
   */
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== 'hidden') return;
      const el = audioRef.current;
      if (!el || el.paused) return;
      el.pause();
      setPlaying(false);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const start = () => {
    const el = audioRef.current;
    if (!el) return;
    el.play().then(() => setPlaying(true)).catch(() => setDead(true));
  };

  const openGate = () => {
    const btn = playRef.current;
    const box = stageRef.current;
    if (btn && box) {
      // Measured rather than hardcoded: the avatar and the button keep their
      // sizes across widths, but a fixed offset would drift silently on any
      // screen that did not match the one it was written on.
      const b = btn.getBoundingClientRect();
      const s = box.getBoundingClientRect();
      setOriginX(b.left + b.width / 2 - s.left - GATE_INSET);
    }
    // The loop behind the gate is about to be blurred. Blurring a playing video
    // repaints it every frame, and this runs on the cheapest Android hardware
    // in the funnel; paused, the blur rasterises once.
    videoRef.current?.pause();
    setGateOpen(true);
  };

  const release = () => {
    setGate('released');
    setGateOpen(false);
    void videoRef.current?.play().catch(() => {});
    // Started here and not after the exit transition: waiting 150ms to obey a
    // tap is exactly the latency that makes an interface feel unheard. The card
    // leaves over the audio that is already playing.
    start();
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    if (gate === 'armed') {
      openGate();
      return;
    }
    start();
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="vm-wrap" data-gate={gateOpen ? 'open' : undefined}>
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
                ref={playRef}
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

                A second `<source>`, and the MP4 first. Measured on the device
                that failed: given only the WebM this player reported MediaError
                4, SRC_NOT_SUPPORTED — TikTok's WebView does not decode VP9, and
                the flat lilac was an empty video box, not a slow one. MP4 leads
                rather than trails because for this clip it is both universally
                playable and the smaller file (373KB against 595KB), and because
                useAssetPrefetch warms exactly one of the two: a single named
                file beats asking `canPlayType` and trusting the answer.

                `<video>` carries no `alt`, so the label moves to `aria-label`. */}
            {/* The wrapper is the gate's frame of reference: an untransformed
                box to measure the beak against and to position the card in. It
                carries the video's own top margin so the step does not move. */}
            <div className="pg-stage" ref={stageRef}>
              <video
                ref={videoRef}
                className="vm-avid"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-label="Anteprima della lettura"
              >
                <source src="/images/gif01.mp4" type="video/mp4" />
                <source src="/images/gif01.webm" type="video/webm" />
              </video>

              {gate !== 'none' && (
                <PauseGate open={gateOpen} originX={originX} onRelease={release} />
              )}
            </div>

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
