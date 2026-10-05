# Architecture — Walletz Agent Studio

**Versão**: 0.1.0  
**Data**: 2026-10-05  
**ADRs relacionados**: ADR-001 a ADR-007

---

## 1. Visão Geral

Arquitetura **monólito modular + workers** para a primeira release comercial. Separação clara de domínios sem microserviços prematuros. Evolução para serviços independentes quando o produto escalar e os limites de domínio estiverem comprovados.

```
┌─────────────────────────────────────────────────────────────────┐
│                        WALLETZ AGENT STUDIO                     │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │  apps/web    │    │            apps/api                   │   │
│  │  Next.js 15  │◄──►│  NestJS (Modular Monolith)            │   │
│  │  React 19    │    │                                       │   │
│  │  TypeScript  │    │  ┌────────┐ ┌────────┐ ┌──────────┐  │   │
│  └──────────────┘    │  │ Auth   │ │ Agents │ │Knowledge │  │   │
│                       │  └────────┘ └────────┘ └──────────┘  │   │
│  ┌──────────────┐    │  ┌────────┐ ┌────────┐ ┌──────────┐  │   │
│  │ apps/worker  │    │  │Convs   │ │Contacts│ │Campaigns │  │   │
│  │ BullMQ       │◄──►│  └────────┘ └────────┘ └──────────┘  │   │
│  │ Workers      │    │  ┌────────┐ ┌────────┐ ┌──────────┐  │   │
│  └──────────────┘    │  │Calendar│ │Billing │ │Analytics │  │   │
│                       │  └────────┘ └────────┘ └──────────┘  │   │
│                       └────────────────┬─────────────────────┘   │
│                                        │                          │
│              ┌─────────────────────────▼──────────────────┐      │
│              │           Data Layer                        │      │
│              │                                             │      │
│              │  PostgreSQL 16 + pgvector  Redis 7          │      │
│              │  (Drizzle ORM, Migrations) (BullMQ, Cache)  │      │
│              │                                             │      │
│              │  S3-Compatible Storage (MinIO dev)          │      │
│              └─────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Módulos do Backend (NestJS)

```
apps/api/src/modules/
├── auth/              # Autenticação, sessões, MFA, OAuth
├── tenants/           # Tenancy, onboarding, configurações
├── users/             # Usuários, convites, memberships
├── roles/             # RBAC, permissões
├── agents/            # Agent Builder, versioning, templates
├── knowledge/         # Teach AI, fontes, chunks, embeddings
├── evaluation/        # Laboratório, eval suites, gates
├── conversations/     # Inbox, mensagens, handoff
├── contacts/          # Contatos, identidades, consentimento
├── imports/           # CSV/XLSX import pipeline
├── campaigns/         # Campanhas, cadências
├── whatsapp/          # WhatsApp adapter, webhooks
├── calendar/          # Google + Microsoft OAuth e scheduling
├── tools/             # Tool catalog, execution engine
├── learning/          # Learning loop, sugestões supervisionadas
├── analytics/         # Métricas, events, dashboards
├── billing/           # Planos, assinaturas, quotas, usage
├── admin/             # Console admin Walletz
├── notifications/     # Notificações internas
└── shared/            # Guards, interceptors, pipes, utils
    ├── audit/         # Audit log service
    ├── outbox/        # Transactional outbox
    ├── storage/       # S3 adapter
    ├── llm/           # LLM provider abstraction
    └── telemetry/     # OpenTelemetry
```

---

## 3. Fluxo de Mensagem (WhatsApp → Agente → Resposta)

```
Meta Webhook
    │
    ▼
POST /webhooks/meta/whatsapp
    │ (ACK 200 imediato)
    │
    ▼
WebhookReceipt (persist + dedupe por provider_message_id)
    │
    ▼
Queue: message.inbound (BullMQ)
    │
    ▼
Worker: MessageProcessor
    │
    ├── Valida tenant/canal/conversa
    ├── Verifica handoff ativo → se humano, entrega para inbox
    │
    ▼
AI Pipeline
    ├── 1. Validar contexto (tenant, canal, estado)
    ├── 2. Verificar handoff/estado
    ├── 3. Classificar intenção (se necessário)
    ├── 4. Montar contexto mínimo
    ├── 5. Recuperar conhecimento (RAG híbrido)
    ├── 6. Aplicar políticas e permissões
    ├── 7. Decidir: responder / ferramenta / humano
    ├── 8. Gerar output estruturado (Claude)
    ├── 9. Validar output
    ├── 10. Executar tool (se autorizada pelo servidor)
    ├── 11. Reavaliar resultado
    ├── 12. Send Policy Gateway
    └── 13. Enviar via WhatsApp adapter
         │
         ▼
    Registrar: trace, uso, fontes, decisão
```

---

## 4. Pipeline RAG (Retrieve-Augment-Generate)

```
Query do usuário
    │
    ▼
Embedding da query (Anthropic Embeddings)
    │
    ├── Busca vetorial (pgvector cosine similarity)
    ├── Busca lexical (PostgreSQL full-text search)
    │
    ▼
Resultados combinados
    │
    ▼
Reranking (por relevância + metadados)
    │
    ▼
Filtros obrigatórios:
    - tenant_id === tenant ativo
    - knowledge_release_id === versão publicada
    - tags aplicáveis
    - validade não expirada
    │
    ▼
Top-K chunks com metadados de fonte
    │
    ▼
Montagem do contexto para LLM
(instrução sistema | config agente | conhecimento recuperado | histórico conversa | query)
    │
    ▼
Claude API (com limiar de confiança)
    │
    ▼
Resposta com citação de fonte
```

---

## 5. Modelo de Tenancy

- Cada tenant tem `tenant_id` (UUID v7)
- Todas as entidades de domínio incluem `tenant_id` com NOT NULL
- Queries sempre filtradas por `tenant_id` no nível de service/repository
- RLS no PostgreSQL como segunda linha de defesa nos dados críticos
- Sem cross-tenant em nenhuma query — testado em TC01 e TC25

---

## 6. Outbox Pattern (Eventos)

```
Transação DB:
    ├── Mutation principal (ex: create agent)
    └── INSERT INTO outbox_events (event_type, payload, tenant_id)

Worker (outbox relay):
    ├── SELECT unpublished FROM outbox_events (with lock)
    ├── Publica no BullMQ
    └── Mark as published

Event consumers:
    ├── Analytics consumer
    ├── Notification consumer
    ├── Webhook consumer (futuro)
    └── Integration consumer
```

Garante atomicidade entre mutation e publicação de evento.

---

## 7. Send Policy Gateway

Executado **obrigatoriamente** antes de qualquer mensagem iniciada pela empresa:

```typescript
interface SendPolicyResult {
  allowed: boolean;
  blockedReason?: string;
  auditCode: string;
}

// Checks em ordem:
// 1. Tenant ativo e assinatura válida
// 2. Quota não excedida
// 3. Canal conectado e ativo
// 4. Contato não bloqueado/suspenso
// 5. Consentimento adequado para finalidade
// 6. Opt-out ausente
// 7. Janela de atendimento aplicável
// 8. Template aprovado quando necessário (fora de janela 24h)
// 9. Frequência/cadência (evitar spam)
// 10. Budget/limite de campanha
// 11. Horário permitido (timezone do contato)
// 12. Rate limit do provedor
// 13. Idempotency key verificada
```

---

## 8. Autenticação e Autorização

```
┌─────────────────────────────────────────────────────────┐
│                   Auth Flow                              │
│                                                          │
│  1. Login (email/senha ou OAuth)                         │
│  2. MFA (obrigatório para Owner/Admin)                   │
│  3. JWT access token (15min) + refresh token (7d)        │
│  4. Sessão revogável (armazenada em Redis)               │
│  5. Contexto de tenant resolvido na request              │
│                                                          │
│  Guards NestJS:                                          │
│  - JwtAuthGuard: valida token                            │
│  - TenantGuard: resolve e valida tenant                  │
│  - RbacGuard: verifica permissão por role                │
│  - QuotaGuard: verifica quota do plano                   │
└─────────────────────────────────────────────────────────┘
```

Papéis: Owner > Admin > Manager > Agent Operator > Analyst > Viewer

---

## 9. Observabilidade

- **Traces**: OpenTelemetry → cada request, job, LLM call tem trace ID
- **Logs**: pino (JSON estruturado) com campos: `traceId`, `tenantId`, `userId`, `module`
- **Métricas**: OpenTelemetry metrics → Prometheus/Grafana
- **Error tracking**: integração com Sentry ou equivalente
- **Dashboards**: ver `docs/operations/DASHBOARDS.md`

Todo log sanitiza: sem tokens, secrets, PII desnecessária, conteúdo de mensagens.

---

## 10. Estratégia de Deploy

```
Desenvolvimento: docker compose (pg + redis + minio)
CI (GitHub Actions): testes + build + scan
Staging: deploy automático em branch staging
Produção: aprovação explícita + estratégia de rollout
```

Migrations: executadas antes do deploy, com dry-run em CI.  
Rollback: scripts documentados em `docs/operations/ROLLBACK_PLAYBOOK.md`.

---

## 11. ERD (Entidades Principais)

Ver diagrama Mermaid em [ERD.md](ERD.md) — mantido sincronizado com schema real.

---

## 12. ADRs

| ID | Título | Status |
|----|--------|--------|
| ADR-001 | Drizzle ORM para acesso a dados | Accepted |
| ADR-002 | BullMQ + Redis para filas | Accepted |
| ADR-003 | NextAuth v5 + NestJS Guards | Accepted |
| ADR-004 | WhatsApp Cloud API como provider principal | Accepted |
| ADR-005 | Stripe como payment provider (com abstração) | Accepted |
| ADR-006 | Anthropic Claude como LLM principal (com abstração) | Accepted |
| ADR-007 | pnpm workspaces + Turborepo para monorepo | Accepted |
