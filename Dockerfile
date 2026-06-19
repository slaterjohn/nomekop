# ---- deps: install with pnpm, skip puppeteer's bundled Chrome -----------------
FROM node:24-slim AS deps
ENV PNPM_HOME=/pnpm PUPPETEER_SKIP_DOWNLOAD=true
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: standalone Next.js output ----------------------------------------
FROM deps AS build
# NEXT_PUBLIC_* values are inlined into the bundle at build time (not read at
# runtime), so they must be present HERE. Pass them as --build-arg; when absent
# they fall back to the app's documented defaults (card languages off, site URL
# localhost). Affiliate tags follow the same pattern if ever needed.
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_CARD_LANGUAGES=""
ARG NEXT_PUBLIC_POSTHOG_KEY=""
ENV STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_CARD_LANGUAGES=${NEXT_PUBLIC_CARD_LANGUAGES} \
    NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
COPY . .
RUN pnpm build

# ---- runtime: slim + system chromium for the PDF pipeline --------------------
FROM node:24-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    # Docker sets HOSTNAME to the container id; Next standalone would bind to
    # it and the in-process PDF renderer could not reach itself on loopback.
    HOSTNAME=0.0.0.0 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_NO_SANDBOX=1 \
    CACHE_DIR=/app/.cache \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Fixture mode needs the committed snapshots; they are tiny.
COPY --from=build --chown=node:node /app/test/fixtures ./test/fixtures
RUN mkdir -p /app/.cache && chown node:node /app/.cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
