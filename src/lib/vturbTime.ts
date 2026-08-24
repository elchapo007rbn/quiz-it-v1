/**
 * Reads the VSL position out of the Vturb player.
 *
 * The player exposes no `<video>` element — not in the document and not in a
 * shadow root — so the position cannot be read from the DOM. What it does
 * expose is a global, verified against the live player on step 15:
 *
 *   window.smartplayer.instances[0].instance
 *     .currentTime   number, seconds, updates during playback
 *     .duration      number, 296.46 for this VSL
 *     .paused        boolean
 *     .seek(n)       works, but this funnel deliberately does not call it
 *
 * `seek` is left alone on purpose. The player ships its own resume prompt, and
 * driving the position from here as well would put two mechanisms in charge of
 * the same thing. The reader answers the player's prompt; this module only
 * reads, so the paywall can discount the gate.
 *
 * Every access is defensive. The global belongs to a third-party script that
 * may be blocked, slow, or reshaped in a future version, and none of those may
 * take the funnel down with them.
 */

interface VturbInstance {
  currentTime?: number;
}

interface VturbGlobal {
  instances?: Record<string, { instance?: VturbInstance } | undefined>;
}

/**
 * Current position in seconds, or null when the player is not ready.
 *
 * Null is distinct from 0: 0 means the player is loaded and sitting at the
 * start, null means there is nothing to read yet. The caller must not persist
 * null as progress.
 */
export function readVturbSeconds(): number | null {
  try {
    const sp = (window as unknown as { smartplayer?: VturbGlobal }).smartplayer;
    const t = sp?.instances?.['0']?.instance?.currentTime;
    return typeof t === 'number' && Number.isFinite(t) && t >= 0 ? t : null;
  } catch {
    return null;
  }
}
