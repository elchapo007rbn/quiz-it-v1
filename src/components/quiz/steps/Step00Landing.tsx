'use client';
import { PauseNotice } from '@/components/quiz/PauseNotice';
import { PressMarquee } from '@/components/quiz/PressMarquee';

interface Props { onStart: () => void; }

export function Step00Landing({ onStart }: Props) {
  return (
    <div className="s00-wrap">
      <div className="progress-wrap">
        <div className="progress-bg">
          <div className="progress-fill" style={{ width: '8%' }} />
        </div>
      </div>

      <div className="s00-content animate-fade-up">
        <div className="s00-stats">
          <div className="s00-stat">
            <div className="s00-stat-icon">🔮</div>
            <div className="s00-stat-text">
              <span className="s00-stat-value">87%</span>
              <span className="s00-stat-label">Dicono di averlo riconosciuto</span>
            </div>
          </div>
          <div className="s00-stat">
            <div className="s00-stat-icon">💜</div>
            <div className="s00-stat-text">
              <span className="s00-stat-value">172K+</span>
              <span className="s00-stat-label">Letture felici</span>
            </div>
          </div>
        </div>

        <h1 className="s00-h1">✨ Pronta a scoprire chi è la tua vera anima gemella?</h1>
        <p className="s00-sub">Fai questa lettura astrale di 1 minuto e scopri il volto della tua anima gemella!</p>

        {/* Was a 2.5MB GIF, on the landing page — the first thing ad traffic
            loads, and the screen where a slow frame costs the most. The same
            120 frames as VP9/H.264 weigh 36KB, a 98.6% cut.

            Cropped by one pixel to 266x328 because H.264 refuses odd dimensions
            and the source was 267 wide. That width was chosen over padding to
            268: at the 160px this renders at, 266 keeps the computed height at
            197px, exactly what the GIF produced, so nothing below it shifts.

            Two sources for the same reason as step 3: WebM covers everything
            current, MP4 catches iOS before 15 and older Android WebViews.
            `<video>` takes no `alt`, so the label moves to `aria-label`. */}
        <video
          className="s00-img"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="Animazione della lettura dell’anima gemella"
        >
          <source src="/images/landing-anima.webm" type="video/webm" />
          <source src="/images/landing-anima.mp4" type="video/mp4" />
        </video>

        <button className="s00-cta" id="start-btn" onClick={onStart}>
          Inizia
        </button>
      </div>

      <PressMarquee />

      <div className="s00-legal">
        <p>
          Continuando, accetti i nostri{' '}
          <a href="#" target="_blank" rel="noopener">Termini di Servizio</a> e la{' '}
          <a href="#" target="_blank" rel="noopener">Privacy Policy</a>.
          Ti invitiamo a leggerli prima di procedere.
        </p>
      </div>

      {/* Renders nothing unless the visitor is on Android inside TikTok, and
          nothing at all on a second visit. Mounted last so it never competes
          with the landing for first paint. */}
      <PauseNotice />
    </div>
  );
}
