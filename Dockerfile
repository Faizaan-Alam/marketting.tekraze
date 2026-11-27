# syntax=docker/dockerfile:1.7
# services.tekraze — production image (Next.js standalone, non-root, read-only friendly)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# --ignore-scripts: no dependency install scripts run in the build
RUN npm ci --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public (browser) values are inlined at build time. Secrets are NOT build args.
ARG NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_ANALYTICS_ORIGIN=
ARG NEXT_PUBLIC_ANALYTICS_DOMAIN=
ENV NEXT_PUBLIC_CAPTCHA_PROVIDER=$NEXT_PUBLIC_CAPTCHA_PROVIDER \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_ANALYTICS_ORIGIN=$NEXT_PUBLIC_ANALYTICS_ORIGIN \
    NEXT_PUBLIC_ANALYTICS_DOMAIN=$NEXT_PUBLIC_ANALYTICS_DOMAIN
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app -H
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null || exit 1
CMD ["node", "server.js"]
