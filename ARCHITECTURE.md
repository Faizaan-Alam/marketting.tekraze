# Architecture

## Decisions (and why)

| Choice                                                   | Why                                                                                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 16 App Router + React 19**                     | Server-rendered HTML for SEO (every service is in the initial HTML), one framework for pages and the single API route, first-class image optimisation, `proxy.ts` for per-request CSP nonces. |
| **TypeScript 6.0 (strict + `noUncheckedIndexedAccess`)** | TypeScript 7 (the native compiler) is "latest", but `typescript-eslint` supports `<6.1`. 6.0.3 is the newest version the lint toolchain supports.                                             |
| **Tailwind CSS 4**                                       | Design tokens live in CSS (`@theme` in `globals.css`); no runtime CSS-in-JS.                                                                                                                  |
| **React Three Fiber 9 + drei, WebGL**                    | Declarative scene graph, automatic disposal, `PerformanceMonitor`. WebGL (not WebGPU) for browser reach. No Spline / remote scenes.                                                           |
| **GSAP + ScrollTrigger**                                 | Scroll progress for the pinned trailer, process bar and cast parallax.                                                                                                                        |
| **Lenis**                                                | Smooth scrolling that keeps native scroll (keyboard, anchors, find-in-page all work). Off for reduced motion.                                                                                 |
| **Framer Motion (LazyMotion + `m`)**                     | Modal shared-element expand, search overlay. Loaded with `domMax` lazily; `MotionConfig reducedMotion="user"`.                                                                                |
| **zod 4**                                                | One schema for client hints and server truth; content files validated at build. Configured `jitless` so it never attempts `eval`.                                                             |
| **nodemailer**                                           | Vetted mail library with header encoding; plain-text emails only.                                                                                                                             |
| **No database**                                          | Nothing to breach. Enquiries are emailed.                                                                                                                                                     |

Rendering is **server-rendered on request** (not fully static) because a fresh CSP nonce per
request is the only way to have a strict script policy without `unsafe-inline`. The page has no
data fetching, so this costs a few milliseconds; static assets are immutable and cacheable.

## One animation loop

```
requestAnimationFrame (GSAP ticker)
 ├─ lenis.raf(time)                  smooth scroll  → ScrollTrigger.update()
 ├─ TrailerController.update         panel opacity, word reveals, rail
 ├─ TrailerMedia.draw                scroll-scrubbed frame sequence (2D canvas)
 ├─ HeroScene TickerDriver           R3F `advance()` (Canvas frameloop="never"), only when visible
 ├─ PosterHoverGL.tick               liquid hover shader, only while a poster is hovered
 └─ Marquee speed, custom cursor     quickTo / timeScale
```

Nothing else calls `requestAnimationFrame` continuously, so there is one frame budget to manage.

## Folder structure

```
src/
  app/                 layout (fonts, boot script, JSON-LD), page, api/enquiry, robots, sitemap, OG image
  proxy.ts             per-request CSP nonce
  content/             ← EDIT HERE: services, site copy, team, video map (typed + zod)
  components/
    sections/          header, trailer (hero), rows, bundle, web apps, process, cast, FAQ, form, footer
    overlays/          boot sequence, search, modal, cursor, client effects
    three/             HeroScene (R3F), PosterHoverGL (raw three.js shader)
    ui/                cards, poster art, avatar, icons, buttons, error boundary
  lib/                 search, sanitize, urls, csp, media manifests, enquiry schema, zod
    client/            store, capabilities, motion loop, focus trap, boot registry, sound
    server/            env, CSRF, rate limit, CAPTCHA, mailer, security log, enquiry handler
  generated/           build output of scripts/build-manifests.mjs (git-ignored)
scripts/               process-media (ffmpeg), build-manifests, add-webapp
public/                video/, members/, posters/, .well-known/
webapps/               your web apps (untrusted input; never executed)
tests/unit, tests/e2e  Vitest and Playwright
deploy/                Docker compose + hardened Nginx
```

## Data flow for assets

```
public/video/*.mp4 ──npm run media──▶ public/video/web/{id.mp4, id-preview.mp4, id-poster.webp, hero-*, frames/}
public/members/*   ─┐
public/posters/*   ─┼─ build-manifests.mjs (validates names, magic bytes, symlinks) ─▶ src/generated/*.json
webapps/*/meta.json ┘                                                                       │
                                                         src/lib/media.ts (zod re-validates) ◀┘
```

## Quality tiers (3D)

| Tier   | Who                                           | What runs                                              |
| ------ | --------------------------------------------- | ------------------------------------------------------ |
| high   | fine pointer, ≥4 cores, ≥4 GB, ≥900 px wide   | hero 3D at DPR 1–1.75, WebGL poster hover, frame scrub |
| medium | WebGL but touch / smaller / weaker            | hero 3D at DPR 1, frame scrub, CSS hovers              |
| low    | no WebGL, Save-Data, reduced motion, ≤2 cores | poster image + CSS; no canvas at all                   |

`?quality=low|medium|high` forces a tier for testing. Every 3D layer sits in an error boundary,
so a failed chunk or lost context falls back to the 2D version silently.

## Component list

BootSequence · SiteHeader · SearchOverlay · Trailer (TrailerMedia, TrailerController,
TrailerRail, HeroScene) · Marquee · RowShell / ServiceRow / TopTenRow · ServiceCard (+ PosterHoverGL)
· ServiceModalHost / ModalFrame · BundleBillboard · WebAppsSection (DeviceFrame, SandboxedIframe) ·
ProcessQueue · CastSection · WhySection · FaqSection · EnquirySection / EnquiryForm · ContinueRow ·
SiteFooter · MobileQuoteBar · CustomCursor · ClientEffects (Lenis, inert, GL hover).

## Skills used during the build

`threejs-react-three-fiber` and `threejs-fundamentals` (Canvas, `frameloop="never"` + `advance`,
disposal), `threejs-performance` (measure-first, shared geometry, one Points draw call, DPR clamp),
`threejs-shaders` / `threejs-materials` / `threejs-textures` (poster ripple shader, CanvasTexture
labels), `threejs-lighting` (local Lightformers instead of remote HDR presets),
`threejs-postprocessing` (decided against a post pass: grain/vignette are a CSS overlay, saving a
full-screen pass), `threejs-interaction` (pointer/gyro parallax), `3d-web-experience` (stack choice
and anti-patterns), `frontend-design` (type, colour and layout system). Where a skill disagreed
with the brief (drei `ScrollControls`, Spline, CDN-hosted drei assets), the brief won.
