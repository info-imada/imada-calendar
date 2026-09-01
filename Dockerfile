# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED="1"

WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@11.9.0 \
  && npm cache clean --force

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

COPY . .

RUN pnpm build

FROM base AS production-dependencies

ENV NODE_ENV="production"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --prod --frozen-lockfile

FROM base AS runner

ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY --chown=node:node prisma ./prisma

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000"]
