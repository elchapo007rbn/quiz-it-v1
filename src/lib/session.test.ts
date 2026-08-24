import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readSession,
  writeSession,
  clearSession,
  isExpired,
  gateRemaining,
  SESSION_KEY,
  SESSION_TTL_MS,
} from './session';

/** Minimal stand-in for the one Storage API surface this module uses. */
function stubStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  vi.stubGlobal('localStorage', storage);
  return map;
}

const BASE = {
  step: 6,
  answers: { name: 'Giulia', gender: 'female' as const },
  patterns: ['unchosen'],
  desires: ['soul'],
  importance: ['passion'],
  videoWatched: 0,
  ctaUnlocked: false,
  timestamp: 1_000_000,
};

beforeEach(() => stubStorage());
afterEach(() => vi.unstubAllGlobals());

describe('isExpired', () => {
  it('accepts a blob saved one second ago', () => {
    expect(isExpired(1000, 2000)).toBe(false);
  });

  it('accepts a blob saved just under 24 hours ago', () => {
    expect(isExpired(0, SESSION_TTL_MS - 1)).toBe(false);
  });

  it('rejects a blob saved exactly 24 hours ago', () => {
    expect(isExpired(0, SESSION_TTL_MS)).toBe(true);
  });

  it('rejects a blob saved well over 24 hours ago', () => {
    expect(isExpired(0, SESSION_TTL_MS * 3)).toBe(true);
  });

  it('rejects a timestamp from the future, which can only be a corrupt clock', () => {
    expect(isExpired(5000, 1000)).toBe(true);
  });
});

describe('gateRemaining', () => {
  it('returns the full gate when nothing was watched', () => {
    expect(gateRemaining(228, 0)).toBe(228);
  });

  it('discounts the seconds already watched', () => {
    expect(gateRemaining(228, 200)).toBe(28);
  });

  it('returns zero when watch time equals the gate', () => {
    expect(gateRemaining(228, 228)).toBe(0);
  });

  it('never returns a negative wait', () => {
    expect(gateRemaining(228, 900)).toBe(0);
  });

  it('ignores a negative watch time rather than extending the wait', () => {
    expect(gateRemaining(228, -50)).toBe(228);
  });
});

describe('readSession', () => {
  it('returns null when nothing was ever saved', () => {
    expect(readSession(2_000_000)).toBeNull();
  });

  it('returns the saved blob when it is fresh', () => {
    stubStorage({ [SESSION_KEY]: JSON.stringify(BASE) });
    expect(readSession(BASE.timestamp + 1000)).toEqual(BASE);
  });

  it('returns null and clears storage when the blob has expired', () => {
    const map = stubStorage({ [SESSION_KEY]: JSON.stringify(BASE) });
    expect(readSession(BASE.timestamp + SESSION_TTL_MS)).toBeNull();
    expect(map.has(SESSION_KEY)).toBe(false);
  });

  it('returns null on malformed JSON instead of throwing', () => {
    stubStorage({ [SESSION_KEY]: '{not json' });
    expect(() => readSession(2_000_000)).not.toThrow();
    expect(readSession(2_000_000)).toBeNull();
  });

  it('returns null when the payload is valid JSON but the wrong shape', () => {
    stubStorage({ [SESSION_KEY]: JSON.stringify({ step: 'six' }) });
    expect(readSession(2_000_000)).toBeNull();
  });

  it('returns null when the step is outside the funnel', () => {
    stubStorage({ [SESSION_KEY]: JSON.stringify({ ...BASE, step: 99 }) });
    expect(readSession(BASE.timestamp + 1000)).toBeNull();
  });

  it('returns null rather than throwing when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => readSession(2_000_000)).not.toThrow();
    expect(readSession(2_000_000)).toBeNull();
  });
});

describe('writeSession', () => {
  it('creates a blob with defaults when none exists', () => {
    const map = stubStorage();
    writeSession({ step: 3 }, 500);
    expect(JSON.parse(map.get(SESSION_KEY)!)).toEqual({
      step: 3,
      answers: { name: '' },
      patterns: [],
      desires: [],
      importance: [],
      videoWatched: 0,
      ctaUnlocked: false,
      timestamp: 500,
    });
  });

  it('merges into an existing blob and refreshes the timestamp', () => {
    const map = stubStorage({ [SESSION_KEY]: JSON.stringify(BASE) });
    writeSession({ step: 7 }, BASE.timestamp + 60_000);
    const saved = JSON.parse(map.get(SESSION_KEY)!);
    expect(saved.step).toBe(7);
    expect(saved.answers).toEqual(BASE.answers);
    expect(saved.timestamp).toBe(BASE.timestamp + 60_000);
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => writeSession({ step: 2 }, 500)).not.toThrow();
  });

  it('does not throw when setItem throws, as it does when the quota is full', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
    });
    expect(() => writeSession({ step: 2 }, 500)).not.toThrow();
  });
});

describe('clearSession', () => {
  it('removes the blob', () => {
    const map = stubStorage({ [SESSION_KEY]: JSON.stringify(BASE) });
    clearSession();
    expect(map.has(SESSION_KEY)).toBe(false);
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => clearSession()).not.toThrow();
  });
});
