/**
 * Eligibility and memory for the step-0 pause notice.
 *
 * The funnel is opened from a TikTok ad, and on Android the feed video keeps
 * playing with sound behind the WebView — it collides with Aura's voice message
 * on step 11 and with the VSL on step 15. iOS pauses the feed on its own, and
 * Android Chrome has no feed behind it at all, so the notice is shown only when
 * both conditions hold.
 *
 * Nothing here may run during render: the landing is prerendered, and reading
 * the user agent while rendering would produce a server/client mismatch. Every
 * caller is a `useEffect`.
 *
 * Storage failures degrade to "not seen" rather than throwing, matching the
 * discipline in `session.ts`.
 */

import { SESSION_TTL_MS } from './session';

/** Namespaced like `SESSION_KEY`, so nothing else on this origin collides. */
const SEEN_KEY = 'quiz_soulmate_pause_notice';

/**
 * TikTok's Android WebView reports every one of these at some point: the
 * generic Bytedance shell, plus the two app code names the client still ships
 * under. Matching any one of them is enough — a false negative costs a visitor
 * the notice, a false positive would show it to someone with no feed behind the
 * page, so the list stays narrow.
 */
const TIKTOK_UA = /BytedanceWebview|musical_ly|trill_|TikTok/i;

export function isAndroidTikTok(ua: string = navigator.userAgent): boolean {
  return /Android/i.test(ua) && TIKTOK_UA.test(ua);
}

/**
 * True once the notice has been shown within the TTL.
 *
 * The write happens when the notice appears, not when it is dismissed: the
 * whole point is that she closes the sheet and taps the link again, which
 * reloads the page. Waiting for a dismissal would show it to her a second time
 * precisely because she did what it asked.
 */
export function wasPauseNoticeSeen(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return false;

    const at = Number(raw);
    // A timestamp in the future can only be a clock change or a hand-edited
    // value; trusting it would suppress the notice forever.
    if (!Number.isFinite(at) || at > now) return false;

    return now - at < SESSION_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Whether to show the Android prompts to someone who is not an Android reader
 * inside TikTok.
 *
 * True in **modo dev** — the build with the step arrows — so both the step-0
 * notice and the step-11 gate can be seen and adjusted on a desktop while
 * working on them. The bundler replaces `NODE_ENV` with a literal, so this
 * branch is dead code in `next build`, exactly like the step navigator.
 *
 * True in a production build only for `?pausa=1`, and only while the dev routes
 * flag is on — that is the tunnel case, where the build is a real one but the
 * reviewer is holding a phone rather than an Android device inside TikTok.
 */
export function isPauseNoticeForced(search: string = location.search): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.NEXT_PUBLIC_DEV_ROUTES !== '1') return false;
  return new URLSearchParams(search).get('pausa') === '1';
}

export function markPauseNoticeSeen(now: number = Date.now()): void {
  try {
    localStorage.setItem(SEEN_KEY, String(now));
  } catch {
    // Quota or a locked-down WebView. She may see the notice twice; that is
    // strictly better than the funnel throwing on step 0.
  }
}
