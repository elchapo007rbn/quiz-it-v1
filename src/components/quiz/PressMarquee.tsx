import { PUBLICATION_LOGOS } from '@/data/quizData';

/**
 * The "In primo piano" press strip.
 *
 * Lives in its own file because two steps show it now - the landing and the
 * paywall - and a second copy of the loop would be free to drift from the
 * first the next time a masthead changes.
 *
 * The list is rendered twice on purpose: the track animates to
 * `translate3d(-50%)`, so the second copy is what the first one slides away to
 * reveal. Only the first set carries alt text; the duplicate is announced to
 * nobody, since a screen reader reading ten mastheads for five publications is
 * noise.
 */
export function PressMarquee() {
  return (
    <div className="s00-marquee">
      <div className="s00-marquee-label">In<br />primo piano</div>

      <div className="s00-marquee-window">
        <div className="s00-marquee-track">
          {[...PUBLICATION_LOGOS, ...PUBLICATION_LOGOS].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              className="s00-logo"
              src={src}
              alt={i < PUBLICATION_LOGOS.length ? `Testata ${i + 1}` : ''}
              aria-hidden={i >= PUBLICATION_LOGOS.length ? true : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
