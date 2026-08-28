import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Dancing_Script, Fraunces, Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { RedTrack } from "@/components/RedTrack";
import { TikTokPixel } from "@/components/TikTokPixel";

// Every family the original funnel declares, self-hosted by next/font and exposed
// as a CSS variable. next/font downloads the files at build time and serves them
// from our own origin with `display: swap` — no runtime request to
// fonts.googleapis.com, which is what keeps first paint fast inside the TikTok
// in-app browser. Weight lists are trimmed to the weights actually rendered:
// every extra weight is another file over the wire.

/**
 * Body text across steps 0-14. Renders at 400/600/700/800, so the variable
 * file is one request instead of four static cuts.
 */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

// The four families below only appear from step 13 onward, so they are NOT
// preloaded — preloading them would cost the landing page ~150KB it never uses,
// which is the whole ballgame inside the TikTok in-app browser. They fetch when
// their step first renders, with `display: swap` covering the gap.

/** Handwriting on the revelation card (step 13) — renders at 400 and 700. */
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-script",
  preload: false,
});

/** Display serif on the email capture (step 14) — the original's `--fd`, 700 only. */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
  preload: false,
});

/** Paywall headings (step 15) — every one of them renders at 900. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-serif",
  preload: false,
});

/**
 * Paywall body copy (step 15). The original names DM Sans but never imports it,
 * so it silently falls back to system-ui there; we load it for real. Spans
 * 400-900, hence the variable file.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  preload: false,
});

/**
 * Android only. Chrome defaults to `interactive-widget=resizes-visual`, where
 * the keyboard covers the page without shrinking the layout viewport — so
 * neither `100dvh` nor a `max-height` media query ever reacts to it.
 * `resizes-content` makes the keyboard shrink the layout viewport, which is
 * what lets the short-viewport rules for step 14 engage.
 *
 * iOS ignores this hint and keeps its overlay-keyboard behaviour, so iPhones
 * render exactly as they do today.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Scopri la Tua Anima Gemella | Lettura Astrale Personalizzata",
  description: "Fai questa lettura astrale di 1 minuto e scopri il volto della tua anima gemella",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${plusJakarta.variable} ${dancingScript.variable} ${fraunces.variable} ${playfair.variable} ${dmSans.variable}`}
    >
      <body>
        {children}
        {/* Writes the `rtkclickid-store` cookie that lib/checkout.ts reads to
            attribute the sale. Sits at the end of <body> because that is where
            Next's docs place a `beforeInteractive` script in the App Router —
            it is hoisted into the initial HTML and runs before any Next module,
            so the position in the tree is not the position it executes from.
            Placing it as a direct child of <html> is invalid markup and breaks
            hydration. See RedTrack. */}
        <RedTrack />
        {/* TikTok Pixel. Every paid visitor on this funnel arrives from a
            TikTok ad, so this is what the ad account optimises against.
            Loads after hydration rather than during parse — see
            TikTokPixel for why the two tags differ. */}
        <TikTokPixel />
        {/* Real-user Core Web Vitals, reported with the visitor's connection
            type. That pairing is the point: this funnel is served into TikTok's
            in-app browser over mobile data, where a page that loads instantly
            on a desk Wi-Fi can fail to load at all — the failure mode that made
            step 11 ship a 13.8MB payload nobody could download. Local testing
            cannot see it; only field data can.

            Inert until Speed Insights is enabled for the project in the Vercel
            dashboard, and it self-disables outside production. */}
        <SpeedInsights />
        {/* Vercel Web Analytics tracks page views and user interactions.
            Inert until Web Analytics is enabled for the project in the Vercel
            dashboard, and it self-disables outside production. */}
        <Analytics />
      </body>
    </html>
  );
}
