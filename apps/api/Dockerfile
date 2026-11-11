# syntax=docker/dockerfile:1.7
# API NestJS. Build a partir da raiz do monorepo:
#   docker build -f apps/api/Dockerfile .
# Migrations: node dist/database/migrate.js (mesma imagem).

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate
WORKDIR /repo

FROM base AS builder
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @walletz/api build
# Só dependências de produção, com node_modules plano (sem symlinks do workspace).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @walletz/api deploy --prod /out \
 && rm -rf /out/dist /out/src \
 && cp -r apps/api/dist /out/dist \
 && cp -r apps/api/src/database/migrations /out/dist/database/migrations

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=builder --chown=node:node /out ./
# StorageService grava os arquivos da base de conhecimento em ./uploads
# (montado como volume no compose de produção).
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
