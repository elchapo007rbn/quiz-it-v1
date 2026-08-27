'use client';

/**
 * The step-11 coach mark that holds Aura's voice message until the reader has
 * been asked to pause the TikTok feed.
 *
 * Presentational only: the step owns the audio, the arming and the measuring,
 * because it owns the elements those depend on.
 */
interface Props {
  open: boolean;
  /**
   * Distance in pixels from this card's left edge to the centre of the play
   * button. Drives both the beak and the transform origin, so the card grows
   * out of the button the reader just pressed.
   */
  originX: number;
  /**
   * Both buttons call this. `Capito!` is for the reader who is about to go and
   * pause; `Salta` is for the one who already paused on step 0. Same outcome —
   * the audio plays — because the difference is what she believes, not what
   * the funnel does.
   */
  onRelease: () => void;
}

export function PauseGate({ open, originX, onRelease }: Props) {
  return (
    <div
      className="pg-gate"
      data-open={open}
      style={{ '--pg-ox': `${originX}px` } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pg-title"
    >
      <span className="pg-beak" aria-hidden="true" />

      <p className="pg-title" id="pg-title">Prima di premere play</p>

      <p className="pg-body">
        Metti in pausa gli altri video. <b>La tua sessione è già al sicuro</b>, clicca
        sotto per ascoltare!
      </p>

      <div className="pg-actions">
        <button type="button" className="pg-skip" onClick={onRelease}>Salta</button>
        <button type="button" className="pg-confirm" onClick={onRelease}>Capito!</button>
      </div>
    </div>
  );
}
