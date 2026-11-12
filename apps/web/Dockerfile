# syntax=docker/dockerfile:1.7
# Frontend Next.js (output standalone). Build a partir da raiz do monorepo:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://walletzcorp.com/agent-studio/api \
#     --build-arg NEXT_PUBLIC_BASE_PATH=/agent-studio .
# Variáveis NEXT_PUBLIC_* são embutidas no bundle em tempo de build.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate
WORKDIR /repo

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_META_APP_ID=""
ARG NEXT_PUBLIC_META_CONFIG_ID=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID \
    NEXT_PUBLIC_META_CONFIG_ID=$NEXT_PUBLIC_META_CONFIG_ID
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "NEXT_PUBLIC_API_URL é obrigatório" >&2; exit 1)
RUN pnpm --filter @walletz/web build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
