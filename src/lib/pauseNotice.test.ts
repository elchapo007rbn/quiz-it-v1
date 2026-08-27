import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isAndroidTikTok,
  isPauseNoticeForced,
  markPauseNoticeSeen,
  wasPauseNoticeSeen,
} from './pauseNotice';
import { SESSION_TTL_MS } from './session';

/** Minimal stand-in for the one Storage API surface this module uses. */
function stubStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  });
  return map;
}

const KEY = 'quiz_soulmate_pause_notice';
const NOW = 1_750_000_000_000;

/* Real strings, trimmed of the parts none of the matching depends on. */
const UA = {
  tiktokAndroid:
    'Mozilla/5.0 (Linux; Android 12; SM-A125F Build/SP1A.210812.016; wv) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.194 Mobile Safari/537.36 trill_2022803040 ' +
    'AppName/musical_ly app_version/28.3.4 BytedanceWebview/d8a21c6',
  tiktokIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'musical_ly_28.3.4 BytedanceWebview/d8a21c6',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/119.0.0.0 Mobile Safari/537.36',
  safariDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Version/17.0 Safari/605.1.15',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('isAndroidTikTok', () => {
  it('matches TikTok on Android — the only case the notice is for', () => {
    expect(isAndroidTikTok(UA.tiktokAndroid)).toBe(true);
  });

  it('rejects TikTok on iOS, where the feed pauses itself', () => {
    expect(isAndroidTikTok(UA.tiktokIos)).toBe(false);
  });

  it('rejects Android outside TikTok, where no feed is playing behind us', () => {
    expect(isAndroidTikTok(UA.chromeAndroid)).toBe(false);
    expect(isAndroidTikTok(UA.safariDesktop)).toBe(false);
  });
});

describe('wasPauseNoticeSeen', () => {
  beforeEach(() => stubStorage());

  it('is false with nothing stored', () => {
    expect(wasPauseNoticeSeen(NOW)).toBe(false);
  });

  it('is true inside the TTL and false once it has run out', () => {
    stubStorage({ [KEY]: String(NOW) });
    expect(wasPauseNoticeSeen(NOW + SESSION_TTL_MS - 1)).toBe(true);
    expect(wasPauseNoticeSeen(NOW + SESSION_TTL_MS)).toBe(false);
  });

  it('ignores a timestamp from the future rather than suppressing forever', () => {
    stubStorage({ [KEY]: String(NOW + 1) });
    expect(wasPauseNoticeSeen(NOW)).toBe(false);
  });

  it('ignores a value that is not a number', () => {
    stubStorage({ [KEY]: 'yesterday' });
    expect(wasPauseNoticeSeen(NOW)).toBe(false);
  });

  it('degrades to "not seen" when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(wasPauseNoticeSeen(NOW)).toBe(false);
  });
});

describe('markPauseNoticeSeen', () => {
  it('stores the timestamp it was given', () => {
    const map = stubStorage();
    markPauseNoticeSeen(NOW);
    expect(map.get(KEY)).toBe(String(NOW));
    expect(wasPauseNoticeSeen(NOW)).toBe(true);
  });

  it('swallows a storage failure instead of breaking step 0', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => markPauseNoticeSeen(NOW)).not.toThrow();
  });
});

describe('isPauseNoticeForced', () => {
  it('honours ?pausa=1 only while the dev routes are enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_DEV_ROUTES', '1');
    expect(isPauseNoticeForced('?pausa=1')).toBe(true);
    expect(isPauseNoticeForced('?pausa=0')).toBe(false);
    expect(isPauseNoticeForced('')).toBe(false);
  });

  it('is inert on the published site', () => {
    vi.stubEnv('NEXT_PUBLIC_DEV_ROUTES', '');
    expect(isPauseNoticeForced('?pausa=1')).toBe(false);
  });
});
