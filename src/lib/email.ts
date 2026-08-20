/**
 * Email validation ported from the original funnel's canonical validator
 * (step 14). Three checks, in order: RFC-ish shape, disposable-inbox
 * blocklist, then a Levenshtein typo suggestion against popular domains.
 */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net',
  'sharklasers.com', 'grr.la', '10minutemail.com', '10minutemail.net', 'tempmail.com',
  'temp-mail.org', 'tempmail.net', 'throwawaymail.com', 'yopmail.com', 'yopmail.fr',
  'trashmail.com', 'trashmail.net', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'fakeinbox.com', 'mailnesia.com', 'mintemail.com', 'mailcatch.com', 'mohmal.com',
  'emailondeck.com', 'spam4.me', 'tempinbox.com', 'moakt.com', 'mailto.plus',
  '1secmail.com', 'discard.email', 'harakirimail.com', 'tempr.email', 'getairmail.com',
  'nada.email', 'fakemail.net', 'fakemailgenerator.com', 'maileater.com', 'inboxbear.com',
  'tmail.com', 'mytemp.email', 'burnermail.io', '33mail.com', 'einrot.com',
]);

const POPULAR = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com',
  'aol.com', 'msn.com', 'gmx.com', 'mail.com', 'proton.me', 'protonmail.com',
  'comcast.net', 'me.com', 'ymail.com', 'yandex.com',
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/** Closest popular domain within edit-distance 2, or null. */
function suggest(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || POPULAR.includes(domain)) return null;

  let best: string | null = null;
  let bestDist = Infinity;
  for (const candidate of POPULAR) {
    const d = levenshtein(domain, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best && bestDist > 0 && bestDist <= 2 ? `${local}@${best}` : null;
}

export type EmailVerdict =
  | { type: 'format' }
  | { type: 'disposable' }
  | { type: 'typo'; suggestion: string }
  | { type: 'ok' };

export function classifyEmail(email: string): EmailVerdict {
  if (!EMAIL_RE.test(email)) return { type: 'format' };

  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  if (DISPOSABLE.has(domain)) return { type: 'disposable' };

  const fix = suggest(email);
  if (fix) return { type: 'typo', suggestion: fix };

  return { type: 'ok' };
}

/**
 * Ghost-text autocomplete (step 14). One letter after `@` resolves the whole
 * provider — the five below cover the overwhelming majority of the audience
 * and no two share a first letter, so there is never an ambiguous match and
 * never a list to navigate. Anything else simply gets no suggestion.
 */
const GHOST_DOMAINS: Record<string, string> = {
  g: 'gmail.com',
  h: 'hotmail.com',
  o: 'outlook.com',
  y: 'yahoo.com',
  i: 'icloud.com',
};

/**
 * Returns the remainder still to be completed for what the user has typed, or
 * null when nothing should be suggested.
 *
 * Matching is lowercased on both sides: `autocapitalize="off"` is not honoured
 * identically by every keyboard, so a capitalised first letter after `@` must
 * still trigger.
 *
 * Returning null once the typed domain stops prefixing the provider is what
 * makes the suggestion vanish for good on divergence — keep typing
 * `globomail.com` after `@g` and no further suggestion appears, because `gl`
 * never prefixes `gmail.com` again.
 */
export function ghostCompletion(typed: string): string | null {
  const at = typed.lastIndexOf('@');
  if (at < 1) return null;                 // no `@` yet, or nothing before it

  const domain = typed.slice(at + 1);
  if (!domain) return null;                // `@` just typed — wait for the trigger letter

  const full = GHOST_DOMAINS[domain[0].toLowerCase()];
  if (!full) return null;                  // first letter is not a trigger
  if (domain.length >= full.length) return null;              // already fully typed
  if (!full.startsWith(domain.toLowerCase())) return null;    // diverged

  return full.slice(domain.length);
}
