'use client';
import { TESTIMONIALS } from '@/data/quizData';

interface Props {
  onContinue: () => void;
  progressPct: number;
}

export function Step12Testimonials({ onContinue, progressPct }: Props) {
  return (
    <div className="ss-wrap">
      <div className="ss-pbc">
        <div className="ss-pbg">
          <div className="ss-pf" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="ss-sc">
        <div className="ss-head">
          <span className="ss-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" />
            </svg>
            Rivelazioni vere
          </span>
          <h1 className="ss-h1">Incontrerai la tua anima gemella <span>presto</span></h1>
          <p className="ss-sub">Anche loro hanno aspettato. Poi tutto è cambiato.</p>
        </div>

        <div className="ss-stats">
          <div className="ss-stat"><b>74,000+</b><small>schizzi creati</small></div>
          <div className="ss-stat"><b><span className="ss-star">★</span>4.9</b><small>valutazione media</small></div>
        </div>

        <div className="ss-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="ss-tcard">
              <div className="ss-imgwrap">
                {/* The four portraits are 864x1184 and 708x536 but render into a
                    191x150 card, so decoding them costs ~10.8MB of bitmap. Done
                    synchronously that lands on the main thread mid-scroll, which
                    is what made this step feel frozen on an iPhone 15 Pro Max.
                    `async` hands it to a decoder thread; the row below the fold
                    waits for `lazy` rather than decoding all four at once.
                    Dimensions are unchanged — .ss-imgwrap fixes the box at 150px
                    and object-fit crops into it exactly as before. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.image}
                  alt={t.name}
                  decoding="async"
                  loading={i < 2 ? 'eager' : 'lazy'}
                />
              </div>
              <div className="ss-tcap">
                <div className="ss-stars">★★★★★</div>
                <p className="ss-q">&quot;{t.text}&quot;</p>
                <div className="ss-n">
                  {t.name}
                  <span className="ss-v">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12l5 5L20 6" />
                    </svg>
                    Verificata
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="ss-cta" onClick={onContinue} type="button">
          Sì, sono pronta!
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
