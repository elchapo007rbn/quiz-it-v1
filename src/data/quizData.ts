import type { ZodiacSign } from '@/types/quiz';

/**
 * Progress-bar targets copied verbatim from the original funnel's
 * `data-qf-target` attributes. The original is NOT step/total — it jumps
 * 8 → 50 → 60 → 70 → 80 → 83 → 85 → 88 → 90 → 95, and steps 1–4 animate
 * their own bar to a fixed value.
 */
export const PROGRESS_TARGETS: Record<number, number> = {
  0: 8,
  1: 15,
  2: 25,
  3: 35,
  4: 40,
  5: 50,
  6: 60,
  7: 70,
  8: 80,
  9: 83,
  10: 85,
  11: 88,
  12: 90,
  13: 95,
  14: 98,
  15: 100,
};

/** Constellation glyphs traced from the original inline SVGs (step 9). */
export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  {
    name: 'Capricorno', startDay: 22, startMonth: 12, emoji: '♑', dates: '22 Dic – 19 Gen', element: 'Terra',
    trait: 'costruisci un amore fatto per durare', match: 'chi è leale e sa impegnarsi davvero',
    shapes: [{ t: 'path', d: 'M6 22L10 11L13 17C13.5 12 18.5 12 20 15.5C21.3 19.5 16.5 22 15 18' }],
  },
  {
    name: 'Acquario', startDay: 20, startMonth: 1, emoji: '♒', dates: '20 Gen – 18 Feb', element: 'Aria',
    trait: 'ami in un modo tutto tuo', match: 'chi ti capisce davvero',
    shapes: [
      { t: 'path', d: 'M7 13L11 10L15 13L19 10L23 13' },
      { t: 'path', d: 'M7 20L11 17L15 20L19 17L23 20' },
    ],
  },
  {
    name: 'Pesci', startDay: 19, startMonth: 2, emoji: '♓', dates: '19 Feb – 20 Mar', element: 'Acqua',
    trait: 'ami con tutta l’anima', match: 'chi ti fa sentire a casa',
    shapes: [
      { t: 'path', d: 'M10 7C5 11 5 21 10 25' },
      { t: 'path', d: 'M22 7C27 11 27 21 22 25' },
      { t: 'path', d: 'M6 16H26' },
    ],
  },
  {
    name: 'Ariete', startDay: 21, startMonth: 3, emoji: '♈', dates: '21 Mar – 19 Apr', element: 'Fuoco',
    trait: 'ami con una passione senza paura', match: 'chi ha il coraggio di reggere il tuo fuoco',
    shapes: [
      { t: 'path', d: 'M16 25V14' },
      { t: 'path', d: 'M16 14C16 9 13 6.5 9.5 8' },
      { t: 'path', d: 'M16 14C16 9 19 6.5 22.5 8' },
    ],
  },
  {
    name: 'Toro', startDay: 20, startMonth: 4, emoji: '♉', dates: '20 Apr – 20 Mag', element: 'Terra',
    trait: 'cerchi un amore leale e duraturo', match: 'chi è stabile e davvero presente',
    shapes: [
      { t: 'circle', cx: 16, cy: 22, r: 5.5 },
      { t: 'path', d: 'M8 10C8 16 24 16 24 10' },
    ],
  },
  {
    name: 'Gemelli', startDay: 21, startMonth: 5, emoji: '♊', dates: '21 Mag – 20 Giu', element: 'Aria',
    trait: 'ti leghi con la mente e le parole', match: 'chi tiene viva la tua curiosità',
    shapes: [
      { t: 'path', d: 'M11 9V23' },
      { t: 'path', d: 'M21 9V23' },
      { t: 'path', d: 'M8 9C11 7 21 7 24 9' },
      { t: 'path', d: 'M8 23C11 25 21 25 24 23' },
    ],
  },
  {
    name: 'Cancro', startDay: 21, startMonth: 6, emoji: '♋', dates: '21 Giu – 22 Lug', element: 'Acqua',
    trait: 'ami in modo profondo e protettivo', match: 'chi ti fa sentire al sicuro',
    shapes: [
      { t: 'path', d: 'M12 11C18 9 25 12 25 17' },
      { t: 'path', d: 'M20 21C14 23 7 20 7 15' },
      { t: 'circle', cx: 12, cy: 12.5, r: 2.2, filled: true },
      { t: 'circle', cx: 20, cy: 19.5, r: 2.2, filled: true },
    ],
  },
  {
    name: 'Leone', startDay: 23, startMonth: 7, emoji: '♌', dates: '23 Lug – 22 Ago', element: 'Fuoco',
    trait: 'ami con tutto il cuore', match: 'chi ti adora e ti ammira',
    shapes: [
      { t: 'circle', cx: 10.5, cy: 21, r: 3.8 },
      { t: 'path', d: 'M13.9 19C17 13.5 13.5 8 18 7.2C21.8 6.5 23.6 9.6 22.4 12.8' },
    ],
  },
  {
    name: 'Vergine', startDay: 23, startMonth: 8, emoji: '♍', dates: '23 Ago – 22 Set', element: 'Terra',
    trait: 'ami con cura e devozione silenziosa', match: 'chi dà valore al tuo cuore gentile',
    shapes: [
      { t: 'path', d: 'M8 22V12C8 10 11 10 11 12V22' },
      { t: 'path', d: 'M11 12C11 10 14 10 14 12V22' },
      { t: 'path', d: 'M14 12C14 10 17 10 17 12V19C17 23 23 23 22 18C21.5 15.6 18.6 16 19 18.4' },
    ],
  },
  {
    name: 'Bilancia', startDay: 23, startMonth: 9, emoji: '♎', dates: '23 Set – 22 Ott', element: 'Aria',
    trait: 'vivi per un’unione autentica', match: 'chi porta un equilibrio vero',
    shapes: [
      { t: 'path', d: 'M7 23H25' },
      { t: 'path', d: 'M7 18H11A5 5 0 0 0 21 18H25' },
    ],
  },
  {
    name: 'Scorpione', startDay: 23, startMonth: 10, emoji: '♏', dates: '23 Ott – 21 Nov', element: 'Acqua',
    trait: 'ami con una devozione intensa', match: 'chi sa reggere la tua profondità',
    shapes: [
      { t: 'path', d: 'M8 21V12C8 10 11 10 11 12V21' },
      { t: 'path', d: 'M11 12C11 10 14 10 14 12V21' },
      { t: 'path', d: 'M14 12C14 10 17 10 17 12V21L24 15' },
      { t: 'path', d: 'M24 15H19.5' },
      { t: 'path', d: 'M24 15V19.5' },
    ],
  },
  {
    name: 'Sagittario', startDay: 22, startMonth: 11, emoji: '♐', dates: '22 Nov – 21 Dic', element: 'Fuoco',
    trait: 'ami in libertà, con spirito d’avventura', match: 'chi condivide il tuo viaggio',
    shapes: [
      { t: 'path', d: 'M8 24L22 10' },
      { t: 'path', d: 'M22 10H14' },
      { t: 'path', d: 'M22 10V18' },
      { t: 'path', d: 'M12 15L18 21' },
    ],
  },
];

export const SIGN_BY_NAME = new Map(ZODIAC_SIGNS.map(s => [s.name, s]));

/** Master Aura's avatar — reused by every chat bubble across steps 8–13. */
export const AURA_AVATAR = '/images/aura-avatar.webp';

// `value` is the key persisted in answers and posted to /api/quiz — it stays in
// English so saved results keep the same shape. Only `label` is ever displayed.
export const LOVE_LIFE_OPTIONS = [
  { value: 'Single', emoji: '🌱', label: 'Single' },
  { value: 'In a relationship', emoji: '💖', label: 'In una relazione' },
  { value: 'Engaged or married', emoji: '💍', label: 'Fidanzato/a o sposato/a' },
  { value: 'Recently out of something', emoji: '💔', label: 'Da poco fuori da una storia' },
  { value: "It's complicated", emoji: '🌀', label: 'È complicato' },
] as const;

export const PATTERN_OPTIONS = [
  { value: 'type', emoji: '🔁', label: 'Attiro sempre lo stesso tipo di persona' },
  { value: 'leave', emoji: '🚪', label: 'Si allontanano proprio quando inizio ad aprirmi' },
  { value: 'walls', emoji: '🧊', label: 'Tengo alta la guardia per non soffrire' },
  { value: 'unchosen', emoji: '💭', label: 'Do tanto, ma non ricevo lo stesso in cambio' },
] as const;

export const DESIRE_OPTIONS = [
  { value: 'safe', emoji: '🛡️', label: 'Sentirmi al sicuro, scelta e protetta nel profondo' },
  { value: 'attraction', emoji: '🔥', label: 'Un’attrazione magnetica e innegabile' },
  { value: 'soul', emoji: '💜', label: 'Un legame che arriva all’anima, dove sento amore vero' },
  { value: 'stable', emoji: '🏡', label: 'Una vita stabile e serena, costruita insieme' },
] as const;

export const IMPORTANCE_OPTIONS = [
  { value: 'stars', emoji: '✨', label: 'Un legame che sembra scritto nelle stelle' },
  { value: 'loyal', emoji: '🤝', label: 'Una persona leale, che non mi faccia mai dubitare' },
  { value: 'passion', emoji: '🌹', label: 'Una passione che resta viva negli anni' },
  { value: 'peace', emoji: '🕊️', label: 'Pace — sentirmi finalmente a casa con qualcuno' },
] as const;

/** Step 12 — four verified testimonials, matching the original 2×2 grid. */
export const TESTIMONIALS = [
  {
    text: 'Dopo anni di attesa, l’ho trovato — proprio come nel disegno.',
    name: 'Giulia C.',
    image: '/images/testimonial-sarah.webp',
  },
  {
    text: 'Ho trovato mio marito subito dopo il disegno della mia anima gemella.',
    name: 'Elisa T.',
    image: '/images/testimonial-ellen.webp',
  },
  {
    text: 'Lo descriveva così bene che pensavo fosse falso. 2 anni dopo, è ancora la mia persona.',
    name: 'Martina H.',
    image: '/images/testimonial-martina.webp',
  },
  {
    text: 'Aura ha descritto il mio compagno alla perfezione. Ora so che è quello giusto.',
    name: 'Chiara C.',
    image: '/images/testimonial-chiara.webp',
  },
] as const;

export const PUBLICATION_LOGOS = [
  '/images/press-logo-1.svg',
  '/images/press-logo-2.svg',
  '/images/press-logo-3.svg',
  '/images/press-logo-4.svg',
  '/images/press-logo-5.svg',
] as const;

export const FAQ_ITEMS = [
  { q: 'Quanto sono accurate le letture?', a: 'L’89% delle donne che hanno completato la lettura ha confermato che i dettagli corrispondevano alla loro esperienza. Misuriamo l’accuratezza perché ci mettiamo la faccia.' },
  { q: 'È un abbonamento?', a: 'No. 9€ è un pagamento unico. Ottieni subito l’accesso completo alla tua lettura. L’App Auraly include una guida quotidiana sull’amore, facoltativa.' },
  { q: 'Come ricevo la mia lettura?', a: 'Subito tramite l’App Auraly (disponibile su iOS e Android). Lì troverai la lettura completa, il report di compatibilità e tutte le rivelazioni.' },
  { q: 'E se non credo nell’astrologia?', a: 'Non è necessario. La tua carta natale nasce dalle posizioni reali dei pianeti nel giorno in cui sei nata: legge schemi energetici, non credenze. Il 34% delle nostre letture più precise è arrivato da donne che all’inizio erano scettiche.' },
  { q: 'Posso avere un rimborso?', a: 'Sì. Se la lettura non ti rispecchia, scrivici entro 7 giorni e ti rimborsiamo tutto. Senza fare domande.' },
] as const;

/** Step 15 — six benefit cards from the "what you'll get" section. */
export const PAYWALL_BENEFITS = [
  { icon: '🌌', title: 'Analisi completa della carta natale', text: 'Interpretazione completa di Venere, Marte e della 7ª Casa — le aree che definiscono l’amore nella tua carta.' },
  { icon: '👤', title: 'L’identità della tua anima gemella', text: 'Iniziali, segno zodiacale, descrizione fisica e tratti di personalità, decodificati dalle stelle.' },
  { icon: '📅', title: 'Quando e dove vi incontrerete', text: 'Il momento e il luogo dell’incontro, basati sui tuoi transiti e sulle progressioni. Preciso, non vago.' },
  { icon: '💕', title: 'Report di compatibilità (sinastria)', text: 'La tua carta {sign} messa a confronto con il segno della tua anima gemella — punteggi di Amore, Fiducia, Comunicazione e Matrimonio.' },
  { icon: '✨', title: 'Guida quotidiana sull’amore', text: 'Intuizioni astrologiche personalizzate, ogni giorno, nell’App Auraly.' },
  { icon: '📍', title: 'La risposta alla tua domanda', text: 'La risposta diretta di Aura Solenne alla domanda che hai posto durante la lettura.' },
] as const;

/** Step 15 — the six locked/preview rows. */
export const PAYWALL_ROWS = [
  { k: 'Iniziali dell’anima gemella', v: '••••••', locked: true },
  { k: 'Il suo segno zodiacale', v: '•••••••', locked: true },
  { k: 'Quando vi incontrerete', v: '••/••/2026', locked: true },
  { k: 'Tratti fisici', v: 'Alto, lineamenti scuri', locked: false },
  { k: 'Come lo riconoscerai', v: 'Uno sguardo inconfondibile', locked: false },
  { k: 'Messaggio dalle stelle', v: '••••••••••', locked: true },
] as const;

/** Step 15 — Facebook-style testimonial screenshots for the carousel. */
export const PAYWALL_CAROUSEL = [
  '/images/testimonial-fb-1.webp',
  '/images/testimonial-fb-2.webp',
  '/images/testimonial-fb-3.webp',
  '/images/testimonial-fb-4.webp',
  '/images/testimonial-fb-5.webp',
  '/images/testimonial-fb-6.webp',
] as const;

/** The preview portrait depends on who the user said they're interested in. */
export const SOULMATE_PREVIEW = {
  male: '/images/soulmate-preview-male.webp',
  female: '/images/soulmate-preview-female.webp',
} as const;
