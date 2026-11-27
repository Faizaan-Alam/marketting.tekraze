# services.tekraze

The services website of [Tekraze](https://tekraze.com), presented as a streaming service:
"Tekraze Studio: Now Streaming". Five service categories are the episodes, the Growth Bundle is
the season finale, and the enquiry form is where your episode starts.

- **Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 · React Three Fiber + drei · GSAP + ScrollTrigger · Lenis · Framer Motion · zod
- **Docs:** [ARCHITECTURE.md](ARCHITECTURE.md) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [SECURITY.md](SECURITY.md) · [SECURITY_AUDIT.md](SECURITY_AUDIT.md) · [DEPLOYMENT.md](DEPLOYMENT.md)

---

## a) Run the site

You need **Node.js 20.9+** (22 LTS recommended) and, optionally, **ffmpeg** for video optimisation.

```bash
npm ci                      # install exact versions from the lockfile
cp .env.example .env.local  # then edit it (see section f)
npm run dev                 # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Checks (the same ones CI runs):

```bash
npm run lint        # ESLint (incl. accessibility rules)
npm run typecheck   # TypeScript strict
npm test            # unit tests (Vitest)
npm run test:e2e    # end-to-end tests (Playwright; run `npm run build` first)
npm run audit:deps  # npm audit
```

For local development, `.env.local` can use `CAPTCHA_PROVIDER=none` and `ENQUIRY_DELIVERY=log`
so the form works without Turnstile or an email account (enquiries are logged, redacted).

## b) Add videos

1. Drop `.mp4`, `.webm` or `.mov` files into **`public/video/`**.
2. Run **`npm run media`**. It needs ffmpeg; it converts every video (including iPhone HEVC) into
   web-ready files in `public/video/web/` — a full version, a 6-second silent preview, a poster
   frame — and builds the hero loop and the scroll-scrubbed frame sequence. It prints each
   video's **id** (the file name in lowercase with dashes).
3. Map videos to places in **`src/content/video-map.json`**:
   - `hero.video` — the id used for the hero background and the scrubbed "trailer" frames.
     `loopStart`/`loopSeconds` pick the loop; `scrubStart`/`scrubEnd` the scrubbed segment.
   - `assignments` — `"<service-slug>": "<video id>"` shows that video as the card's hover
     preview and in the title card. `growth-bundle` is also a valid key.
   - `details` — a title, a description (shown as the video transcript/description for
     screen-reader users) and an optional captions file name (`.vtt` in `public/video/captions/`).
4. Restart `npm run dev` (manifests are rebuilt automatically before `dev` and `build`).

If the folder is empty, the hero and cards use animated fallbacks; there are never broken players.
Raw source files are git-ignored (they are large); commit the optimised `public/video/web/` folder,
or use Git LFS if you want to version the originals.

## c) Register a web app ("Our Originals")

```bash
npm run webapp:add -- --title "My App" --description "What it does" \
  --url https://myapp.example.com --tags "React,API" --thumbnail ~/Pictures/myapp.png
```

This creates `webapps/my-app/meta.json` and copies the thumbnail beside it. You can also create the
folder and `meta.json` by hand — see [webapps/README.md](webapps/README.md). The live URL only ever
opens inside a sandboxed iframe, and its origin is added to the CSP automatically. Nothing in
`webapps/` is ever executed by this site.

## d) Add or edit team members

Edit **`src/content/team.ts`**. Each member has a `slug`, `name`, `role`, `bio`, `hue` (tile colour),
optional `photoFocus` (photo crop, e.g. `"50% 30%"`) and `socials` (https links only).

Photos go in **`public/members/<slug>.jpg|jpeg|png|webp|avif`** — for example
`public/members/kamran-alam.jpg`. A missing photo shows a generated initials avatar.

> **Placeholders to fill:** every `role` and `bio` is currently empty on purpose (the UI shows
> "Tekraze team" and no bio). Please add the real roles and short bios yourself.

## e) Edit service content

All copy lives in typed, validated files in **`src/content/`** — never inside components:

| File             | What it holds                                                                         |
| ---------------- | ------------------------------------------------------------------------------------- |
| `services.ts`    | The 5 categories, the 11 services, the Growth Bundle, the Top 10 order (`topRank`)    |
| `site.ts`        | Headline, tagline, process steps, Why Tekraze, timelines, FAQ, links, social profiles |
| `team.ts`        | Team members                                                                          |
| `video-map.json` | Which video goes where                                                                |

To add a service, copy an entry in `services.ts`, give it a unique `slug` and a `category`. It then
appears in its row, in search, in the enquiry form's Service dropdown and in the JSON-LD. A typo
fails the build and the unit tests (zod validation) instead of shipping a broken page.

To replace a generated poster, add `public/posters/<service-slug>.jpg` (or png/webp/avif).

## f) Environment variables

Copy `.env.example` and fill it in. Never commit real values (`.env*` is git-ignored).

| Variable                                                                                  | Purpose                                                                                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                                                                                | Public URL (used for the form's Origin check)                                                                                   |
| `CSRF_SECRET`                                                                             | 32+ random characters; signs CSRF tokens, hashes IPs in logs                                                                    |
| `CLIENT_IP_HEADER`                                                                        | Header your proxy sets to the real client IP (`x-real-ip` behind the provided Nginx, `cf-connecting-ip` behind Cloudflare only) |
| `CAPTCHA_PROVIDER`, `NEXT_PUBLIC_CAPTCHA_PROVIDER`                                        | `turnstile` (production) or `none` (local only)                                                                                 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                  | From the Cloudflare Turnstile dashboard                                                                                         |
| `ENQUIRY_DELIVERY`                                                                        | `smtp` (send email) or `log` (local testing)                                                                                    |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO` | Your email provider                                                                                                             |
| `RATE_LIMIT_*`, `MIN_FILL_SECONDS`                                                        | Abuse limits (defaults are sensible)                                                                                            |
| `NEXT_PUBLIC_ANALYTICS_ORIGIN`, `NEXT_PUBLIC_ANALYTICS_DOMAIN`                            | Optional cookie-less analytics (off when empty)                                                                                 |

`NEXT_PUBLIC_*` values are baked into the browser bundle at **build** time; the rest are read at run time.

## g) Deploy

The recommended setup is **Docker + Nginx behind Cloudflare** (ready-made files in `deploy/`):

```bash
cd deploy
cp ../.env.example app.env && chmod 600 app.env   # fill in real values
echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=..." > .env
docker compose up -d --build
```

Full steps — TLS, HSTS preload, Cloudflare WAF and rate limits, updates, backups — are in
[DEPLOYMENT.md](DEPLOYMENT.md).

---

## Quality numbers (measured 2026-11-27, production build, Lighthouse 13.6)

|                                        | Performance | Accessibility | Best practices | SEO | LCP   | CLS | TBT    |
| -------------------------------------- | ----------- | ------------- | -------------- | --- | ----- | --- | ------ |
| Desktop                                | 99          | 100           | 100            | 100 | 0.9 s | 0   | 0 ms   |
| Mobile (simulated 4G, mid-range phone) | 98          | 100           | 100            | 100 | 0.9 s | 0   | 160 ms |

Measured against `localhost`; expect real-world numbers to shift with hosting and CDN. Reports:
`docs/lighthouse/`.
# marketting.tekraze
