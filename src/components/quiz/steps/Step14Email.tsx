'use client';
import { useRef, useState } from 'react';
import { classifyEmail, ghostCompletion } from '@/lib/email';

interface Props {
  name: string;
  onSubmit: (email: string) => void;
  progressPct: number;
}

/**
 * Runs a value/selection mutation without letting it move the page.
 *
 * Assigning `.value` and calling `setSelectionRange` each ask the browser to
 * scroll the caret back into view, and on iOS that re-runs the keyboard's own
 * scroll-into-view on top of it — which is why the page jumped upward the
 * instant "@g" armed the first suggestion. Restoring the offset in the same
 * tick means the browser never gets a frame in which to paint the intermediate
 * position, so the correction is invisible rather than a second jump.
 */
function withoutScrolling(mutate: () => void) {
  const x = window.scrollX;
  const y = window.scrollY;
  mutate();
  if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
}

export function Step14Email({ name, onSubmit, progressPct }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');
  /** Remembers the value a typo warning was raised for, so a second submit
   *  of the same address goes through — same escape hatch as the original. */
  const [warnedFor, setWarnedFor] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  /** True while a ghost suggestion is selected inside the field. */
  const [ghosting, setGhosting] = useState(false);

  const clear = () => { setError(''); setSuggestion(''); };

  /**
   * The suggested remainder lives inside the input's own value, selected. That
   * keeps it perfectly aligned with the centred text and the caret, and adds
   * nothing positioned to the screen — an overlay would have to centre
   * "typed + ghost" as one string, shifting the real text out from under the
   * caret, and the PRD flags absolutely-positioned elements as a WebView risk.
   * `.evD-ghosting::selection` strips the highlight so the selection reads as
   * light unfilled text.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error || suggestion) clear();

    const el = e.target;
    const typed = el.value;
    const inputType = (e.nativeEvent as InputEvent).inputType;

    // Only a genuine keystroke arms the ghost. Deletions must not revive it
    // (backspacing the suggestion would otherwise re-add it forever), and a
    // paste or the keyboard's own autofill takes precedence outright.
    const rest = inputType === 'insertText' ? ghostCompletion(typed) : null;

    if (!rest) {
      setGhosting(false);
      setEmail(typed);
      return;
    }

    // Written straight to the DOM so the suggestion lands in the same frame as
    // the keypress — the PRD wants the feedback immediate, not a render later.
    // React re-renders with an identical value, so the selection survives.
    //
    // Guarded because the selection API is unavailable on `type="email"` by
    // spec (only text/search/url/tel/password support it). Where it throws we
    // degrade to a plain field rather than breaking typing.
    let armed = true;
    withoutScrolling(() => {
      el.value = typed + rest;
      try {
        el.setSelectionRange(typed.length, typed.length + rest.length);
      } catch {
        el.value = typed;
        armed = false;
      }
    });

    if (!armed) {
      setEmail(typed);
      setGhosting(false);
      return;
    }
    setEmail(typed + rest);
    setGhosting(true);
  };

  /** Collapses the selection, turning the ghost into ordinary typed text. */
  const acceptGhost = () => {
    setGhosting(false);
    const el = inputRef.current;
    if (!el) return;
    withoutScrolling(() => {
      try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* unsupported input type */ }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!ghosting) return;
    // Tab, Enter/Go and space all accept. Each is swallowed: space is invalid
    // in an address anyway, and the accepting Enter must not also submit — a
    // second Enter finds no ghost and falls through to the form.
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      acceptGhost();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    setEmail(value);
    setGhosting(false);

    const verdict = classifyEmail(value);
    if (verdict.type === 'format') {
      setSuggestion('');
      setError('Inserisci un indirizzo email valido.');
      return;
    }
    if (verdict.type === 'disposable') {
      setSuggestion('');
      setError('Usa la tua email principale — le caselle temporanee non possono ricevere la tua lettura.');
      return;
    }
    if (verdict.type === 'typo' && value !== warnedFor) {
      setError('');
      setSuggestion(verdict.suggestion);
      setWarnedFor(value);
      return;
    }

    clear();
    onSubmit(value);
  };

  const acceptSuggestion = () => {
    setEmail(suggestion);
    clear();
    setWarnedFor(null);
    onSubmit(suggestion);
  };

  const inputClass = [error ? 'invalid' : '', ghosting ? 'evD-ghosting' : '']
    .filter(Boolean).join(' ') || undefined;

  return (
    <div className="evD">
      <div className="evD-prog"><i style={{ width: `${progressPct}%` }} /></div>

      <div className="evD-teaser">
        <div className="evD-orbwrap">
          <div className="evD-ring" />
          <div className="evD-orb" />
          <span className="evD-orblock">🔒</span>
        </div>
        <span className="evD-tkicker"><i />Il suo volto è pronto</span>
        <p className="evD-tline">Si chiama <b>Mxxxxx</b></p>
      </div>

      <h1 className="evD-h1">
        {name ? (
          <>{name}, dove vuoi che<br />inviamo la tua lettura?</>
        ) : (
          <>Dove vuoi che<br />inviamo la tua lettura?</>
        )}
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="evD-field">
          <input
            ref={inputRef}
            // `text`, not `email`: the ghost text needs setSelectionRange, which the
            // HTML spec only exposes on text/search/url/tel/password. Nothing is
            // lost here — `inputMode` still drives the @-key keyboard, `autoComplete`
            // still drives autofill, and the form is `noValidate`, so the browser's
            // native email check was already switched off.
            type="text"
            name="email"
            autoComplete="email"
            inputMode="email"
            // `autocapitalize` is what keeps the trigger letter lowercase; the
            // spell/correct pair stops iOS fighting the same characters the
            // ghost is already completing.
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="tu@email.com"
            className={inputClass}
            value={email}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setGhosting(false)}
            aria-describedby="evD-ghost-hint"
            // No `autoFocus`: it is what raised the keyboard unprompted the
            // moment the step mounted, and it fires while the step is still
            // animating in, so the keyboard and the transition compete for the
            // same frames. Worse, WebViews disagree about whether autofocus
            // may open a keyboard without a preceding user gesture, so the
            // step behaved differently on iOS, on Android and inside TikTok.
            // Letting the tap open it makes the sequence identical everywhere.
            required
          />
          {/* The suggestion is real selected text, so a screen reader would read
              it as typed. Announce it as a suggestion instead. */}
          <span id="evD-ghost-hint" className="evD-sr" aria-live="polite">
            {ghosting ? `Suggerimento: ${email}` : ''}
          </span>
          {error && <div className="evD-fmsg show">{error}</div>}
          {suggestion && (
            <div className="evD-fsug show">
              Forse intendevi{' '}
              <button type="button" onClick={acceptSuggestion}>{suggestion}</button>?
            </div>
          )}
        </div>

        <button type="submit" className="evD-cta">Continua</button>

        <p className="evD-fine">🔒 Privato e sicuro. Puoi disiscriverti quando vuoi.</p>
      </form>
    </div>
  );
}
