# Security self-audit — 2026-11-27

Scope: the production build of services.tekraze (Next.js 16.4.6), its single API endpoint, the
build scripts that read user-supplied folders, the Docker image and the Nginx config.
Method: automated tests (Vitest unit, Playwright e2e against the production server), a manual
attack battery with `curl` against `next start`, a CSP-violation probe in headless Chromium,
`npm audit`, and Lighthouse best-practices. Honest summary: **no exploitable issue remains that I
could find; two weaknesses were found and fixed; residual risks are listed at the end.**

## What was tested

| Area                        | Attack                                                                                                                                                       | How                                    | Result                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| XSS — search                | `<script>`, `"><img onerror>`, `<svg onload>`, `javascript:`, template-injection strings typed into search and passed via `?q=`                              | e2e (dialog tripwire, DOM check), unit | Rendered as text; no element injected; `?q=` cleaned, capped, re-encoded                                                                    |
| XSS — form                  | Same payloads in names and message                                                                                                                           | unit + e2e + curl                      | Names rejected (422); message accepted as inert text; nothing is ever rendered as HTML; email is plain text                                 |
| XSS — reflected             | `?q=<script>…` in server HTML                                                                                                                                | curl                                   | Not reflected (search is client-only)                                                                                                       |
| Regex DoS                   | `(a+)+$`, unbalanced brackets, 64-char bombs                                                                                                                 | unit (timing)                          | No RegExp built from input; 200 searches < 1.5 s                                                                                            |
| SQL / NoSQL injection       | `' OR '1'='1`, `; DROP TABLE`, `{"$gt":""}` operator objects                                                                                                 | unit + curl                            | No database exists; operator objects fail type validation (422)                                                                             |
| Prototype pollution         | `__proto__` / `constructor.prototype` keys in JSON                                                                                                           | unit + curl                            | `strict` schema rejects unknown keys (422); `Object.prototype` untouched                                                                    |
| Header injection            | CRLF + `Bcc:` in name/email; CRLF in client-IP header                                                                                                        | unit + curl                            | Rejected by schema; Subject/Reply-To stripped of CR/LF anyway; runtime refuses CRLF headers                                                 |
| CSRF                        | No token, mismatched cookie/header, forged/foreign HMAC, expired, cross-origin `Origin`, `Sec-Fetch-Site: cross-site`, `text/plain` "simple" cross-site post | unit + e2e + curl                      | 403 / 415                                                                                                                                   |
| Token replay                | Re-posting an accepted token with a manual Cookie header                                                                                                     | curl                                   | **Was accepted — fixed** (tokens are now single-use)                                                                                        |
| Bots                        | Honeypot filled; submit faster than 3 s                                                                                                                      | unit                                   | Silently dropped / rejected                                                                                                                 |
| Oversized payloads          | 50 KB / 1 MB bodies, with and without honest `Content-Length`                                                                                                | unit + e2e + curl                      | 413 (streaming cap)                                                                                                                         |
| Rapid-fire                  | 7 posts from one IP; many IPs vs global cap                                                                                                                  | unit + e2e                             | 429 after the limit, with `Retry-After`; global cap enforced                                                                                |
| Error leakage               | Broken JSON, failing SMTP (`ECONNREFUSED` with an internal IP and path)                                                                                      | unit + e2e                             | Generic messages; no stack, path, IP or library names                                                                                       |
| Method tampering            | PUT/DELETE/PATCH, `X-HTTP-Method-Override`                                                                                                                   | e2e + curl                             | 405 / ignored                                                                                                                               |
| Path traversal              | `..%2f`, `%2e%2e`, `....//`, `..%5c`, `/.env.local`, `/.git/HEAD`, `/generated/../../`                                                                       | e2e + curl                             | 404; no file outside `public/` reachable                                                                                                    |
| Traversal in folders I fill | File names with `../`, `\`, NUL, control chars, dot-files; symlink escaping `webapps/` to `/etc`; SVG/HTML disguised as images                               | unit (real temp dirs + symlinks)       | Rejected / ignored with a warning                                                                                                           |
| SSRF                        | `/_next/image?url=` with cloud-metadata IP, external host, API route, `../../etc/passwd`                                                                     | e2e + curl                             | 400 (remote patterns empty, local allow-list)                                                                                               |
| Open redirect               | `?service=https://evil.example`, `?q=javascript:`                                                                                                            | e2e + curl                             | No redirect; slug allow-list                                                                                                                |
| Host header                 | `Host: evil.example`                                                                                                                                         | curl                                   | Not reflected; Nginx returns 444 for unknown hosts                                                                                          |
| Iframe escape               | Sandbox attributes of the only iframe; unsafe `liveUrl` values (`javascript:`, `http:`, localhost, private IPs, own origin)                                  | unit                                   | `sandbox="allow-scripts"` only (no same-origin/top-nav/popups/forms), `no-referrer`, `credentialless`; unsafe URLs never rendered or framed |
| CSP                         | Headless Chromium listening for `securitypolicyviolation` on first and returning visits                                                                      | probe                                  | **zod's `Function("")` feature probe was blocked by the CSP — fixed** by routing zod through a `jitless` config; now 0 violations           |
| Headers                     | CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP, CORP, XFO, no X-Powered-By, unique nonce per request                                          | e2e                                    | Present and correct                                                                                                                         |
| Dependencies                | `npm audit --audit-level=moderate`                                                                                                                           | CI + local                             | 0 vulnerabilities                                                                                                                           |
| Container                   | Runs as uid 100, read-only root FS, all capabilities dropped                                                                                                 | docker run                             | Works; raw source videos excluded from the image                                                                                            |

Totals at the time of writing: **115 unit tests** and **33 end-to-end tests** (desktop + mobile)
passing; Lighthouse Best Practices **100** on desktop and mobile.

## Fixed during the audit

1. **CSRF token replay** — tokens were stateless-signed, so a script could re-send an accepted token
   (with its cookie) until expiry, limited only by the rate limit. Now each accepted token is
   recorded and refused on reuse (bounded in-memory store, pruned on expiry). Test added.
2. **eval attempt blocked by CSP** — zod 4 probes `new Function` to enable its JIT. It fell back
   safely, but produced CSP violation reports. All zod imports now go through `src/lib/zod.ts`
   (`jitless: true`), enforced by an ESLint `no-restricted-imports` rule.
3. Also fixed while testing: a missing-chunk error in the optional 3D layer could have reached the
   page-level error boundary; 3D and WebGL layers are now isolated in their own boundaries.

## Accepted, documented trade-offs

- `style-src 'unsafe-inline'` — needed for React/Framer Motion inline style attributes. There is no
  HTML injection point, so there is no way to inject CSS.
- The per-IP limiter and single-use token store are **in memory**: correct for the recommended
  single Docker instance, per-instance on serverless. The edge rate-limit rule (Cloudflare) is the
  primary control — see DEPLOYMENT.md.
- The client IP comes from a header your proxy sets (`CLIENT_IP_HEADER`). It is only trustworthy if
  the proxy **overwrites** it (the provided Nginx does). Without a proxy, clients could rotate fake
  IPs to dodge the per-IP limit; the global cap and CAPTCHA still apply.
- `public/video/web/meta.json` (video dimensions/duration) is publicly readable. It contains no
  sensitive data.
- Turnstile is the only third-party script; if Cloudflare is unreachable the form cannot be
  submitted (fails closed).
- ESLint 9.39 is used (ESLint 10 is not yet supported by `eslint-plugin-import` and
  `eslint-plugin-jsx-a11y`). It is a dev-only tool and never shipped.
- The three.js `Clock` deprecation warning in the console comes from React Three Fiber itself.

## Residual risks you must handle

1. **Hosting:** keep the server patched (unattended-upgrades), SSH keys only, firewall to
   Cloudflare ranges, Docker updated.
2. **DNS & domain:** registrar lock, 2FA on the registrar and Cloudflare, DNSSEC if available.
3. **TLS & HSTS preload:** only submit to the preload list when every subdomain of tekraze.com
   serves HTTPS — preload is hard to undo.
4. **Email provider:** SPF/DKIM/DMARC; an app password for SMTP; 2FA on the mailbox. Treat every
   enquiry email as untrusted input (it is plain text, but links in a message can still be phishing).
5. **Secrets:** generate `CSRF_SECRET` randomly; keep `deploy/app.env` at mode 600 and in a
   password manager; rotate SMTP and Turnstile secrets if a laptop or server is compromised.
6. **Accounts:** 2FA on GitHub (enable branch protection + required CI on `main`), the VPS
   provider, Cloudflare and the email provider.
7. **Web apps you register:** a `liveUrl` you add is framed in a sandbox, but you are still
   vouching for that site — only add domains you control.
8. **Monitoring:** watch the JSON security logs (`docker compose logs app | grep '"scope":"security"'`)
   for spikes of `rate_limited`, `csrf_failed` or `captcha_failed`.
9. **Third-party profile links:** the Pinterest link on tekraze.com points to a personal profile
   (`in.pinterest.com/balvinder294`), and the Instagram link uses the `instagram.com/@tekraze786`
   form. Both were copied as-is from the live site; please confirm they are the official profiles.
