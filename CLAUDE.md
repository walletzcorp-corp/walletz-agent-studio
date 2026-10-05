# CLAUDE.md — Walletz Agent Studio

## Visão do Produto

**Walletz Agent Studio** é um SaaS B2B no-code/low-code para criação, ensino, teste, publicação e operação de agentes de inteligência artificial. Empresas criam e operam agentes de IA sem programação. A meta de experiência é "Ensine sua IA como ensinaria um novo funcionário."

## Arquitetura

- **Monorepo** com pnpm workspaces
- `apps/web` — Next.js 15 + React 19 + TypeScript strict (frontend)
- `apps/api` — NestJS + TypeScript strict (backend REST + outbox)
- `apps/worker` — NestJS workers para jobs assíncronos
- `packages/ui` — Design system + componentes acessíveis (shadcn/ui base)
- `packages/contracts` — DTOs, schemas compartilhados, OpenAPI types
- `packages/config` — ESLint, TypeScript, configs compartilhadas
- `packages/ai` — Provider adapters, pipeline RAG, eval framework
- `packages/integrations` — WhatsApp, Google Calendar, Microsoft Graph
- `packages/testing` — Utilities de teste, fixtures, helpers
- `infra/` — Docker Compose, CI/CD configs
- `docs/` — Documentação técnica e de produto

## Stack Principal

- **Frontend**: Next.js 15, React 19, TypeScript strict, Tailwind CSS, shadcn/ui, React Hook Form + Zod, Playwright (E2E)
- **Backend**: NestJS, TypeScript strict, class-validator, OpenAPI/Swagger
- **Banco**: PostgreSQL 16 + pgvector, Drizzle ORM (migrations versionadas)
- **Filas**: Redis 7 + BullMQ (queues separadas por workload, DLQ, retry/backoff)
- **Storage**: S3-compatible (MinIO em dev), URLs temporárias assinadas
- **Observabilidade**: OpenTelemetry, logs estruturados (pino), trace/correlation IDs
- **Infra**: Docker Compose dev, GitHub Actions CI

## Convenções de Código

- TypeScript strict em todos os pacotes
- Imports absolutos com aliases de path (`@walletz/...`, `@/...`)
- Sem `any` — use tipos explícitos ou `unknown`
- Sem `console.log` em produção — use logger estruturado
- Todos os módulos NestJS isolados por domínio
- Todos os DTOs validados com class-validator + Zod onde aplicável
- Nomenclatura: camelCase para variáveis/funções, PascalCase para tipos/classes, SCREAMING_SNAKE para constantes
- UUID v7 (ULID-ordered) para IDs de entidade
- `tenant_id` obrigatório em todas as entidades de domínio multi-tenant
- `created_at`, `updated_at` em todas as tabelas

## Definition of Done (DoD)

Uma feature é considerada pronta SOMENTE quando:

1. Implementação completa (sem TODOs, handlers vazios ou fluxos parciais)
2. Testes unitários cobrindo casos críticos e edge cases
3. Testes de integração para endpoints e queries
4. Autorização validada no servidor (não apenas no front)
5. Isolamento de tenant verificado
6. Audit log gerado para mutações relevantes
7. Erro tratado com mensagem clara e trace ID
8. OpenAPI documentado
9. `docs/release/STATUS.md` atualizado
10. CI verde (lint, typecheck, testes)

## Proibições Absolutas

- NUNCA mock/fake em rotas de produção
- NUNCA misturar dados entre tenants
- NUNCA logar secrets, tokens ou dados sensíveis
- NUNCA confirmar agendamento sem `external_event_id` do provedor
- NUNCA marcar integração como conectada sem handshake real/sandbox oficial
- NUNCA enviar campanha sem validação de consentimento e elegibilidade
- NUNCA permitir que texto de usuário/documento conceda permissão ao agente
- NUNCA aprendizado automático em produção sem aprovação humana
- NUNCA deletar dados de tenant por falha de pagamento (grace period)
- NUNCA declarar feature pronta sem evidência de funcionamento

## Comandos Principais

```bash
# Setup inicial
pnpm install

# Desenvolvimento
pnpm dev                    # Todos os apps em paralelo
pnpm --filter @walletz/web dev
pnpm --filter @walletz/api dev
pnpm --filter @walletz/worker dev

# Banco de dados
pnpm db:migrate             # Rodar migrations
pnpm db:migrate:dry         # Dry run de migrations
pnpm db:studio              # Drizzle Studio UI

# Testes
pnpm test                   # Unit + integration
pnpm test:e2e               # Playwright E2E
pnpm test:security          # Suite de segurança
pnpm test:isolation         # Suite de isolamento de tenant
pnpm test:evals             # Suite de avaliações de agente

# Qualidade
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript check
pnpm format                 # Prettier

# CI completo
pnpm ci                     # lint + typecheck + test + build

# Docker
docker compose up           # Infra local (pg, redis, minio)
docker compose up --build   # Full stack local
```

## Estrutura de Módulos (API)

Cada módulo NestJS segue a estrutura:
```
modules/
  <domain>/
    <domain>.module.ts
    <domain>.controller.ts
    <domain>.service.ts
    <domain>.repository.ts
    dto/
    entities/
    guards/
    events/
    __tests__/
```

## Gestão de Segredos

- Desenvolvimento: `.env.local` (não commitado)
- Staging/Produção: secret manager (Doppler ou equivalente)
- `.env.example` sempre atualizado com todas as variáveis sem valores reais

## Política de Branches

- `main` — produção (protegida)
- `staging` — ambiente de homologação
- `develop` — integração de features
- `feat/<ticket>-<slug>` — features
- `fix/<ticket>-<slug>` — correções

## Referências

- [PRODUCT_SPEC.md](docs/product/PRODUCT_SPEC.md)
- [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)
- [THREAT_MODEL.md](docs/architecture/THREAT_MODEL.md)
- [STATUS.md](docs/release/STATUS.md)
- [IMPLEMENTATION_BASELINE.md](docs/product/IMPLEMENTATION_BASELINE.md)
