import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Instrument_Sans } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { site } from "@/content/site";
import { jsonLdGraph } from "@/lib/structured-data";
import { Providers } from "@/components/overlays/Providers";
import { safeOrigin } from "@/lib/urls";
import "./globals.css";

// next/font downloads these at build time and serves them from our own origin (no runtime
// requests to Google), with font-display: swap.
const display = Big_Shoulders({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-big-shoulders",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site.url,
    siteName: "Tekraze",
    title: site.title,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@tekraze",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/**
 * Runs before first paint (nonce-allowed): marks JS/motion support and restores the cosmetic
 * session choices so the intro and profile screen never flash for returning visitors.
 * Values read from sessionStorage are validated before use.
 */
const BOOT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)d.classList.add("motion-ok");var s=window.sessionStorage;if(s.getItem("tz-boot")==="1")d.setAttribute("data-boot","seen");var p=s.getItem("tz-profile");if(p&&/^[a-z0-9-]{1,40}$/.test(p))d.setAttribute("data-profile",p)}catch(e){}})();`;

/**
 * Optional cookie-less analytics (e.g. Plausible). Off unless BOTH variables are set; the origin
 * is validated and also added to the CSP by src/proxy.ts. No cookies, no consent banner needed.
 */
const ANALYTICS_ORIGIN = safeOrigin(process.env.NEXT_PUBLIC_ANALYTICS_ORIGIN ?? "");
const ANALYTICS_DOMAIN = /^[a-z0-9.-]{3,100}$/.test(process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN ?? "")
  ? process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN
  : null;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const ld = JSON.stringify(jsonLdGraph()).replace(/</g, "\\u003c");
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce}>{BOOT_SCRIPT}</script>
        <script type="application/ld+json" nonce={nonce}>
          {ld}
        </script>
        {ANALYTICS_ORIGIN && ANALYTICS_DOMAIN ? (
          <script
            defer
            nonce={nonce}
            data-domain={ANALYTICS_DOMAIN}
            src={`${ANALYTICS_ORIGIN}/js/script.js`}
          />
        ) : null}
      </head>
      <body>
        <a
          href="#main"
          className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-full bg-paper px-5 py-3 font-semibold text-ink"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <div className="film-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
