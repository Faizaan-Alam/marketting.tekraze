# Deployment

**Recommended:** Docker (Next.js standalone) behind the provided hardened Nginx, with
**Cloudflare** in front for DNS, TLS at the edge, WAF, bot protection and rate limiting.
Why not serverless? The in-memory rate limiter and single-use CSRF store assume one long-lived
instance; a single small VPS (1 vCPU / 1 GB) is plenty for this site.

## 1. Server

1. A fresh Ubuntu LTS VPS. Create a non-root sudo user; disable password SSH login
   (`PasswordAuthentication no`), use SSH keys only.
2. Firewall: allow 22 (ideally only from your IP), 80, 443. With Cloudflare, allow 80/443 only from
   [Cloudflare's IP ranges](https://www.cloudflare.com/ips/).
3. Automatic security updates: `sudo apt install unattended-upgrades && sudo dpkg-reconfigure unattended-upgrades`.
4. Install Docker Engine + compose plugin from Docker's official repository.

## 2. TLS certificate

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d services.tekraze.com   # before Nginx is running
```

Renewal: certbot installs a timer; add a deploy hook to reload Nginx:
`--deploy-hook "docker compose -f /srv/services-tekraze/deploy/docker-compose.yml exec nginx nginx -s reload"`.
(With Cloudflare "Full (strict)" mode you can instead use a Cloudflare Origin Certificate.)

## 3. Configure and start

```bash
git clone <your repo> /srv/services-tekraze && cd /srv/services-tekraze/deploy
cp ../.env.example app.env && chmod 600 app.env
#   SITE_URL=https://services.tekraze.com
#   CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
#   CLIENT_IP_HEADER=x-real-ip
#   CAPTCHA_PROVIDER=turnstile + TURNSTILE_SECRET_KEY
#   ENQUIRY_DELIVERY=smtp + SMTP_* + MAIL_FROM + MAIL_TO
echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>" > .env
docker compose up -d --build
docker compose logs -f app      # look for "Ready"
```

Smoke test: `curl -I https://services.tekraze.com` shows the CSP and HSTS headers; submit the form
once and confirm the email arrives.

## 4. Cloudflare

- DNS: proxied (orange cloud) `A` record for `services`.
- SSL/TLS: **Full (strict)**, Always Use HTTPS, minimum TLS 1.2, HSTS enabled (after a week of
  testing submit `services.tekraze.com` / `tekraze.com` to <https://hstspreload.org> only if every
  subdomain is HTTPS).
- Security: Bot Fight Mode (or Super Bot Fight Mode), WAF managed rules on.
- Rate limiting rule: `URI Path equals /api/enquiry` and `Method equals POST` → 5 requests / 10 min
  per IP → Block. (This is the primary limit; the app and Nginx limits are backups.)
- Turnstile: create a widget for `services.tekraze.com`; put the site key in `deploy/.env`, the
  secret in `app.env`.
- Behind Cloudflare, Nginx must restore the real IP: uncomment the `set_real_ip_from` /
  `real_ip_header CF-Connecting-IP` block in `deploy/nginx.conf` with the current ranges.
  Nginx then passes it to the app as `X-Real-IP` (overwritten, never appended).

## 5. Email

Use a transactional provider (e.g. the one behind your domain's mailbox, or Postmark/SES/Brevo).
Set SPF, DKIM and DMARC for the sending domain so enquiry emails are not marked as spam. Use an
app-specific SMTP password, not your mailbox password.

## 6. Updates and backups

- Code/dependency updates: merge Dependabot PRs after CI is green, then
  `git pull && docker compose up -d --build`.
- The app has **no database**: back up the repository (including `public/video/web/`,
  `public/members/`, `webapps/`) and `deploy/app.env` (store it in a password manager, not git).
- Keep 2FA on: domain registrar, Cloudflare, GitHub, the VPS provider and the email provider.

## Alternative: Vercel / Cloudflare Pages

Possible, with caveats: each serverless instance has its own memory, so the per-IP limiter and
the single-use token store are per instance. If you deploy there, enforce the rate limit at the
edge (Vercel Firewall / Cloudflare rate-limit rule) and treat the in-app limiter as best effort.
The security headers, CSP and everything else work unchanged.
