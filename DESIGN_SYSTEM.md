# Design system

**Concept: "On air."** A streaming service where the shows are Tekraze's services. The one
recurring brand mark is the **tally light** — the red dot a studio camera lights when it is live.
It marks what is happening now: the episode on screen, the focused card, the primary action.
Everything else stays quiet: projector black, warm film-white type, generous space.

Netflix gives the structure (profiles, rows, title cards); the craft comes from the techniques of
the three references (loader with real progress and a marquee wordmark; pinned scroll-scrubbed
storytelling with word-by-word headlines; smooth scroll, WebGL hover, custom cursor). No layouts,
code, copy or assets were copied.

## Colour

| Token         | Hex       | Use                                            |
| ------------- | --------- | ---------------------------------------------- |
| `ink`         | `#000000` | Page background (projector black)              |
| `ink-2`       | `#0d0b0f` | Panels, form, modal                            |
| `ink-3`       | `#19161c` | Raised surfaces, inputs                        |
| `ink-4`       | `#25212a` | Hover surfaces                                 |
| `line`        | `#322d37` | Hairlines, borders                             |
| `paper`       | `#eee8e1` | Primary text (warm film white) — 17.6:1 on ink |
| `paper-dim`   | `#aaa1a8` | Secondary text — 8.0:1                         |
| `paper-faint` | `#8a828a` | Tertiary text — 5.6:1                          |
| `tally`       | `#f2243a` | Accent text, dots, rails, glows — 5.1:1 on ink |
| `tally-deep`  | `#d4112a` | Primary button fill (white text 5.3:1)         |

Category hues (poster art and tile glows only — never text): Brand 352°, Content 36°, Web 192°,
Video 318°, Research 232°.

## Type

| Role      | Face                                                | Notes                                                                     |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Display   | **Big Shoulders** (variable, `opsz` 72, weight 800) | Condensed cinema-marquee letterforms; headlines, episode titles, numerals |
| Body / UI | **Instrument Sans** (variable)                      | Clean grotesk with good small-size legibility                             |

Both are self-hosted by `next/font` (downloaded at build, served from our origin, `font-display: swap`).

Scale (perfect fourth, 1.333): 12 · 13 · 14 · **16** · 19 · 21 · 28 · 38 · 50 · 67 · 90 · 120 px.
Display sizes are fluid with `clamp()` (e.g. hero `clamp(3.6rem, 10.5vw, 9.5rem)`), line-height
0.92, `text-wrap: balance`. Body 16 px / 1.6, measure ≤ 62ch.

## Layout & spacing

- 12-column editorial grid (`.grid-12`), gutters `clamp(1rem, 4vw, 3.5rem)`.
- Content left-aligned; only the cast credits are centred (they are a ritual).
- 4 px base spacing; sections breathe with `clamp(3rem, 8vw, 6rem)` vertical padding.
- Rows bleed to the screen edge; their first card aligns to the gutter (`scroll-padding-inline`).
- Radii by hierarchy: pills 999 px (buttons, tags) · cards 0.6–0.8 rem · panels 1–1.25 rem.

## Motion

| Token                | Value                            | Use                      |
| -------------------- | -------------------------------- | ------------------------ |
| `--duration-quick`   | 140 ms                           | Press feedback           |
| `--duration-base`    | 260 ms                           | Hovers, toggles          |
| `--duration-slow`    | 480 ms                           | Card lift, modal         |
| `--duration-scene`   | 900 ms                           | Intro open, zoom-through |
| `--ease-out-expo`    | `cubic-bezier(0.16, 1, 0.3, 1)`  | Things arriving          |
| `--ease-in-out-cine` | `cubic-bezier(0.65, 0, 0.35, 1)` | Scene changes            |
| `--ease-snap`        | `cubic-bezier(0.2, 0.9, 0.1, 1)` | Presses                  |

Rules: one orchestrated moment per screen; motion answers an action or carries the story
(episodes, progress); nothing animates for decoration alone. `prefers-reduced-motion` turns off
Lenis, the pinned trailer, parallax, 3D, previews, the cursor and grain animation, and the
content falls back to a plain readable stack.

## Signature moments

| Moment           | Technique                                                                                            | Fallback                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Boot ident       | Letter-by-letter red wordmark, counter = resolved/declared real assets                               | Hidden without JS; 350 ms for reduced motion; skippable (button / Esc) |
| Season 1 trailer | Sticky stage, ScrollTrigger progress → panels, word reveals, frame-sequence canvas, R3F deck         | Stacked episodes with poster image                                     |
| Marquee          | GSAP loop, `timeScale` ← Lenis velocity                                                              | Static strip                                                           |
| Poster ripple    | One shared WebGL renderer, canvas re-parented into the hovered poster, GLSL ripple + chromatic split | The SVG poster (CSS drift animation)                                   |
| Cursor           | Dot → labelled ring ("View"/"Play") over `[data-cursor]`                                             | Native cursor; hidden on touch, reduced motion and after any key press |
| Watch queue      | ScrollTrigger progress bar, episodes light up                                                        | Static, all lit                                                        |
| Cast credits     | "Starring …" + parallax portraits                                                                    | Static                                                                 |
| Our Originals    | CSS 3D laptop tilting toward the cursor, sandboxed preview                                           | Flat frame                                                             |
| Micro-copy       | "Skip intro", "Next episode in …", "Watch episode N"                                                 | —                                                                      |
| Sound            | Web Audio blips, off by default, visible toggle                                                      | Silent                                                                 |

## Overlays

Film grain (SVG turbulence, 7% overlay, stepped jitter) + vignette, fixed, never interactive,
removed in forced-colors mode.
