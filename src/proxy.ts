import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { webAppFrameOrigins } from "@/lib/media";
import { safeOrigin } from "@/lib/urls";

/**
 * Adds a fresh nonce-based Content-Security-Policy to every HTML response. Next.js reads the
 * nonce from the request's CSP header and applies it to its own scripts; our layout reads it
 * from `x-nonce` for the few inline scripts we add.
 */
export function proxy(request: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV !== "production",
    frameOrigins: webAppFrameOrigins,
    analyticsOrigin: safeOrigin(process.env.NEXT_PUBLIC_ANALYTICS_ORIGIN ?? ""),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|video|members|posters|generated|fonts|\\.well-known|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
