# Security

## Reporting a vulnerability

Please report privately through <https://tekraze.com/contact-us/> with "Security" in the subject.
See also [`/.well-known/security.txt`](public/.well-known/security.txt).

## Security model

The site is **static content plus one endpoint**. There are no accounts, no admin panel and no
database. The only server-side code that
handles input is `POST /api/enquiry` (and `GET /api/enquiry`, which issues a CSRF token).

### Enquiry endpoint — checks in order

| #   | Check                                                                                                                                                                                                     | Failure                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `Content-Type: application/json`                                                                                                                                                                          | 415                                        |
| 2   | Body ≤ 16 KB (declared length **and** a hard streaming cap)                                                                                                                                               | 413                                        |
| 3   | `Origin` on the allow-list and `Sec-Fetch-Site: same-origin`                                                                                                                                              | 403                                        |
| 4   | Rate limit per client IP (5 / 10 min) and a global cap (120 / h)                                                                                                                                          | 429 + `Retry-After`                        |
| 5   | CSRF: signed token in an `HttpOnly; Secure; SameSite=Strict` `__Host-` cookie **and** the `X-CSRF-Token` header must match; HMAC valid; age 3 s – 2 h (time-to-submit check); **single use**              | 403 / 400                                  |
| 6   | JSON parse; must be a plain object                                                                                                                                                                        | 400                                        |
| 7   | zod schema, `strict` (unknown keys — incl. `__proto__`, `constructor` — rejected), NFKC + control/bidi character stripping, length limits, name character class, email format, Service from an allow-list | 422 + field messages (never echoing input) |
| 8   | Honeypot field must be empty (fake success otherwise)                                                                                                                                                     | 200 (dropped)                              |
| 9   | Cloudflare Turnstile token verified server-side (fixed URL, 5 s timeout)                                                                                                                                  | 400                                        |
| 10  | Deliver by email (nodemailer, plain text, CRLF stripped from Subject/Reply-To)                                                                                                                            | 502/503 generic                            |

Errors are always short and generic; no stack traces, paths or versions. Security events are logged
as JSON lines with a **keyed hash of the IP** and no message bodies or full email addresses.

### Output and XSS

- React escapes all output. `dangerouslySetInnerHTML` is not used anywhere (ESLint `react/no-danger`).
- JSON-LD and the boot script are rendered as script text by React (which escapes `</script`);
  `<` is additionally escaped as `<`.
- No `eval`, `new Function`, or runtime `RegExp` from input (ESLint rules). zod runs `jitless`, so
  it never probes `Function` either.
- Search runs entirely in the browser over a static index, with plain `indexOf`/subsequence
  matching; highlights are split into React text nodes. `?q=` and `?service=` are validated
  (cleaned/capped; slug allow-list) before use and written back only through `URLSearchParams`.
- Every link in content is validated as `https:` to a public host; external links use
  `target="_blank" rel="noopener noreferrer"`.

### HTTP headers

| Header                          | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content-Security-Policy (HTML)  | `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com <web-app origins>; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` — fresh nonce per request (`src/proxy.ts`) |
| Content-Security-Policy (API)   | `default-src 'none'; frame-ancestors 'none'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Content-Security-Policy (media) | `default-src 'none'; frame-ancestors 'none'; sandbox`                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Strict-Transport-Security       | `max-age=63072000; includeSubDomains; preload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| X-Content-Type-Options          | `nosniff`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Referrer-Policy                 | `strict-origin-when-cross-origin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Permissions-Policy              | camera, microphone, geolocation, payment, USB, serial, HID, MIDI, magnetometer, display-capture, browsing-topics disabled; gyroscope/accelerometer `self` (hero parallax)                                                                                                                                                                                                                                                                                                                                       |
| Cross-Origin-Opener-Policy      | `same-origin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Cross-Origin-Resource-Policy    | `same-origin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| X-Frame-Options                 | `DENY`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| X-Powered-By                    | removed (`poweredByHeader: false`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

`style-src` keeps `'unsafe-inline'` because React and Framer Motion set inline style attributes;
with no HTML injection points, CSS injection has no entry point.

### Untrusted folders

- **`webapps/`** — never imported or served. `meta.json` is size-capped and schema-validated;
  thumbnails must be a plain file name inside the folder (symlink escapes are blocked), are
  checked by magic bytes (SVG refused) and copied to `public/generated/`. Previews render only
  in `<iframe sandbox="allow-scripts" referrerpolicy="no-referrer" loading="lazy" allow="" credentialless>`
  — **no `allow-same-origin`**, so the framed page gets an opaque origin and cannot touch our
  cookies, storage or DOM, navigate the top window, open popups or submit forms. Only origins of
  validated `liveUrl`s are added to `frame-src`.
- **`public/video/`, `public/members/`, `public/posters/`** — scanned by name only (no
  separators, dot-files or control characters; symlinks must stay inside), images verified by
  magic bytes, ffmpeg always invoked with argument arrays (never a shell). The app re-validates
  every manifest path with zod. Static files are served by Next.js from `public/` only; there is no
  directory listing; `/_next/image` only optimises local paths from an allow-list.

### Supply chain

- Exact versions (`save-exact`), lockfile committed, `npm ci --ignore-scripts` in CI/Docker.
- Only one package in the tree has an install script (`fsevents`, optional, macOS only).
- `npm audit` in CI; Dependabot for npm, GitHub Actions and Docker.
- No runtime third-party scripts except Cloudflare Turnstile (and optional cookie-less analytics
  if you enable it). Fonts are self-hosted. No CDN-hosted 3D assets.
- Secrets only in environment variables; `.env*` git-ignored; `.env.example` documents them.
