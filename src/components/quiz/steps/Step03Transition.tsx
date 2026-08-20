'use client';

interface Props {
  interest?: string;
  onContinue: () => void;
}

export function Step03Transition({ interest, onContinue }: Props) {
  const pronoun = interest === 'male' ? 'lui' : interest === 'female' ? 'lei' : 'quella persona';

  return (
    <div className="aura-transition">
      <div className="aura-wrap" style={{ textAlign: 'center', paddingTop: 40 }}>
        <h1 className="aura-q" style={{ marginBottom: 12 }}>La lettura della tua anima gemella è iniziata</h1>
        <p className="aura-sub" style={{ marginTop: 0 }}>
          Ogni risposta che dai rende più nitido il ritratto di {pronoun}. Ancora pochi dettagli e il volto inizierà a prendere forma.
        </p>
        {/* Was a 19.6MB GIF — ~31s of download on 5Mbps mobile, on step 3 of 16,
            before the visitor has invested anything in the funnel. Same clip as
            VP9/H.264 is 0.22MB, a 98.9% cut, at SSIM 0.95 against the original
            and rendered at 280px where the difference is not visible anyway.
            Geometry, duration (5.5s), frame rate (10fps) and the loop are
            unchanged; only the container format differs.

            Two sources because iOS gained WebM only in 15: WebM serves everyone
            current, MP4 catches older iOS and any Android WebView without VP9.
            `<video>` carries no `alt`, so the label moves to `aria-label`. */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="Lettura dell’anima gemella"
          style={{ display: 'block', width: '100%', maxWidth: 280, margin: '0 auto', borderRadius: 20 }}
        >
          <source src="/images/soulmate-transition-it.webm" type="video/webm" />
          <source src="/images/soulmate-transition-it.mp4" type="video/mp4" />
        </video>
        <button className="aura-cta" onClick={onContinue}>Continua</button>
      </div>
    </div>
  );
}
