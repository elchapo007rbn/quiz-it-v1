export interface QuizAnswers {
  gender?: 'male' | 'female';
  interest?: 'male' | 'female' | 'both';
  loveLife?: string;
  patterns?: string[];
  desires?: string[];
  importance?: string[];
  name: string;
  zodiac?: string;
  email?: string;
}

/** One shape of a zodiac constellation glyph, traced from the original SVGs. */
export type GlyphShape =
  | { t: 'path'; d: string }
  | { t: 'circle'; cx: number; cy: number; r: number; filled?: boolean };

export interface ZodiacSign {
  /** Italian display name — also the key stored in `answers.zodiac`. */
  name: string;
  /** Unicode glyph — used by the birth-chart hero (step 10). */
  emoji: string;
  dates: string;
  /**
   * First day of the sign's range, as numbers. The revelation card (step 13)
   * derives its "Data di nascita" from these instead of parsing `dates`, so
   * translating the visible range can never break the card.
   */
  startDay: number;
  startMonth: number;
  /** Display-only, like `dates` — nothing branches on it. */
  element: 'Fuoco' | 'Terra' | 'Aria' | 'Acqua';
  /** Reading copy injected into the "Sun in X" chip. */
  trait: string;
  /** Reading copy injected into the "Venus is active" chip. */
  match: string;
  /** Line-art constellation drawn in the step-9 picker. */
  shapes: GlyphShape[];
}

export const TOTAL_STEPS = 16; // steps 0-15
