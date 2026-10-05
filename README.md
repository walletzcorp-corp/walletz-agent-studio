# Walletz Agent Studio

SaaS B2B no-code/low-code para criação, ensino, teste, publicação e operação de agentes de inteligência artificial.

> "Ensine sua IA como ensinaria um novo funcionário."

## Status

**Sprint 0 — Fundação** (em progresso)

Ver [docs/release/STATUS.md](docs/release/STATUS.md) para o estado completo do projeto.

## Quick Start

### Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Docker e Docker Compose

### Setup local

```bash
# 1. Clone o repositório
git clone <url>
cd walletz-agent-studio

# 2. Instale dependências
pnpm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com seus valores

# 4. Inicie a infraestrutura local
docker compose -f infra/docker/docker-compose.yml up -d

# 5. Rode as migrations
pnpm db:migrate

# 6. Inicie os apps
pnpm dev
```

### URLs locais

| App | URL |
|-----|-----|
| Frontend (Next.js) | http://localhost:3000 |
| API (NestJS) | http://localhost:3001 |
| API Docs (Swagger) | http://localhost:3001/api/docs |
| MinIO Console | http://localhost:9001 |

### Comandos úteis

```bash
pnpm test           # Testes unitários + integração
pnpm test:e2e       # Testes E2E (Playwright)
pnpm lint           # ESLint
pnpm typecheck      # TypeScript check
pnpm ci             # Pipeline completo (lint + typecheck + test + build)
pnpm db:studio      # Drizzle Studio (UI do banco)
```

## Arquitetura

Monorepo com pnpm workspaces + Turborepo.

```
apps/
  web/          # Next.js 15 (frontend)
  api/          # NestJS (backend)
  worker/       # NestJS workers (jobs assíncronos)
packages/
  ui/           # Design system compartilhado
  contracts/    # DTOs e schemas Zod compartilhados
  config/       # TypeScript, ESLint, Prettier configs
  ai/           # LLM provider adapters, RAG pipeline
  integrations/ # WhatsApp, Google Calendar, Microsoft Graph
  testing/      # Test utilities
infra/
  docker/       # Docker Compose + PostgreSQL init
  ci/           # GitHub Actions
docs/           # Documentação técnica
```

Ver [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) para detalhes.

## Documentação

- [Product Spec](docs/product/PRODUCT_SPEC.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [Threat Model](docs/architecture/THREAT_MODEL.md)
- [Release Status](docs/release/STATUS.md)
- [External Blockers](docs/release/EXTERNAL_BLOCKERS.md)
- [Implementation Baseline](docs/product/IMPLEMENTATION_BASELINE.md)

## Blockers Externos

Algumas integrações requerem credenciais do proprietário do produto antes de serem validadas em produção. Ver [docs/release/EXTERNAL_BLOCKERS.md](docs/release/EXTERNAL_BLOCKERS.md).

## Licença

Proprietário — Walletz Corp. Todos os direitos reservados.
