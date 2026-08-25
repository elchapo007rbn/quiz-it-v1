/**
 * The VSL player on step 15 is a custom element, not a React component, so JSX
 * has no idea it exists until it is declared here.
 *
 * Only the two attributes the embed actually sets are typed. Everything else the
 * player needs comes from its loader script, which reads the element's id and
 * configures itself — there is no prop surface to model.
 */
import type { CSSProperties } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'vturb-smartplayer': {
        id: string;
        style?: CSSProperties;
        children?: React.ReactNode;
      };
    }
  }
}

/**
 * `window._plt` — the timestamp the Vturb player subtracts from to report its
 * `player.ttpi` metric. Written by whichever of the vendor's inline snippet,
 * VturbPreload, or smartplayer.js itself runs first; all three guard with `||`.
 */
declare global {
  interface Window {
    _plt?: number;
  }
}

export {};
