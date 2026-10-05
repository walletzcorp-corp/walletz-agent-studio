# Implementation Baseline — Walletz Agent Studio

**Data**: 2026-10-05  
**Status**: Sprint 0 — Fundação iniciada

---

## 1. Estado Atual do Repositório

Repositório criado do zero nesta sessão. Nenhum código preexistente encontrado.  
Blueprint `Walletz_Agent_Studio_Blueprint_Completo_v2.pdf` **não localizado** — procedendo com base no Prompt Mestre.

---

## 2. O Que Existe

| Item | Estado |
|------|--------|
| Git repo | ✅ Inicializado |
| CLAUDE.md | ✅ Criado |
| Estrutura de diretórios | ✅ Criada |
| Documentação fundacional | 🔄 Em progresso |
| Monorepo (pnpm workspaces) | 🔄 Em progresso |
| CI/CD pipeline | 🔄 Em progresso |
| Docker Compose dev | 🔄 Em progresso |

---

## 3. O Que Falta (por módulo)

### Módulo A — Organização, tenancy e usuários
- [ ] Schema e migrations: Tenant, User, Membership, Role, Permission, Session, ApiKey, FeatureFlag
- [ ] Auth service (cadastro, login, OAuth/OIDC, MFA)
- [ ] RBAC middleware e guards
- [ ] Audit log service
- [ ] Settings de tenant (timezone, idioma, moeda)

### Módulo B — Meus Agentes
- [ ] Entidades: Agent, AgentDraft, AgentRelease, AgentToolPermission
- [ ] Wizard de criação (8 passos)
- [ ] Templates (SDR, Comercial, Atendimento, etc.)
- [ ] Versionamento e rollback
- [ ] UI: Agent Builder

### Módulo C — Walletz Teach AI
- [ ] Entidades: KnowledgeSource, KnowledgeChunk, Fact, Guidance, Procedure, Policy, Example
- [ ] Upload seguro com antivírus/MIME validation
- [ ] Pipeline de processamento: parser, OCR, chunking, embeddings
- [ ] Busca híbrida (lexical + vetorial com pgvector)
- [ ] Versionamento de knowledge releases
- [ ] UI: interface de ensino conversacional

### Módulo D — Laboratório de IA
- [ ] Entidades: EvaluationSuite, EvaluationCase, EvaluationRun, EvaluationResult
- [ ] Chat de teste com trace completo
- [ ] Adversarial test suite (13 cenários padrão)
- [ ] Gate de publicação (bloqueia se P0 falhar)
- [ ] Comparação entre versões

### Módulo E — Conversas / Inbox
- [ ] Entidades: Conversation, Message, MessageDeliveryEvent, HumanHandoff, InternalNote
- [ ] Inbox UI com filtros e busca
- [ ] Handoff humano com pause AI atômico
- [ ] Timeline auditável
- [ ] WebSocket para tempo real

### Módulo F — WhatsApp Business Platform
- [ ] Adapter oficial (Cloud API ou BSP parceiro)
- [ ] Webhook com verificação de assinatura Meta
- [ ] Deduplicação por provider_message_id
- [ ] Send Policy Gateway
- [ ] Templates e status
- [ ] Opt-in/opt-out e lista de supressão
- [ ] DLQ e retry com backoff

### Módulo G — Contatos, leads e importação
- [ ] Entidades: Contact, ContactIdentity, Consent, Suppression, ImportBatch
- [ ] Import CSV/XLSX com preview, mapeamento, E.164, dedupe
- [ ] Modelo de consentimento por canal/finalidade

### Módulo H — Campanhas e cadências
- [ ] Entidades: Campaign, CampaignRecipient, Cadence, CadenceEnrollment
- [ ] Send Policy Gateway integrado
- [ ] Cadências com stop conditions
- [ ] Batch processing com rate limiting

### Módulo I — Agenda Google e Microsoft 365
- [ ] OAuth Google Calendar + Microsoft Graph
- [ ] Disponibilidade, locks anti-double-booking
- [ ] Criação/cancelamento/reagendamento com external_event_id
- [ ] Google Meet e Teams meeting links

### Módulo J — Ferramentas e ações
- [ ] Catálogo de tools server-controlled
- [ ] Tool execution com autorização, timeout, retry, audit

### Módulo K — Learning Loop
- [ ] Detecção de oportunidades de aprendizado
- [ ] Central de Aprendizado Pendente
- [ ] Aprovação humana obrigatória antes de produção

### Módulo L — Analytics
- [ ] Events pipeline
- [ ] Dashboards: ativação, conversas, custo LLM, saúde integrações

### Módulo M — Billing e planos
- [ ] Entidades: Plan, Subscription, UsageEvent, InvoiceReference
- [ ] Abstração de payment provider (Stripe como referência)
- [ ] Quotas, overage, grace period, suspensão

### Módulo N — Administração da plataforma
- [ ] Console admin Walletz separado do tenant
- [ ] Health dashboard, DLQ management, feature flags

---

## 4. Inconsistências e Decisões

| Decisão | Escolha | Justificativa | ADR |
|---------|---------|---------------|-----|
| ORM | Drizzle ORM | Type-safe, migrations SQL-first, performance | ADR-001 |
| Queue | BullMQ + Redis | Maduro, UI disponível, idempotência nativa | ADR-002 |
| Auth | NextAuth v5 + NestJS Guards | Integração Next.js simplificada | ADR-003 |
| WhatsApp Provider | Cloud API oficial Meta | Único canal seguro/homologável | ADR-004 |
| Payment | Stripe (abstração própria) | Maior adoção, SDK maduro, suporte PIX futuro | ADR-005 |
| LLM Provider | Anthropic Claude (abstração) | Provider principal; abstração permite evolução | ADR-006 |
| Monorepo | pnpm workspaces + Turborepo | Cache de build, task graph, DX | ADR-007 |

---

## 5. Dependências Externas (External Blockers Iniciais)

| Dependência | Status | Impacto |
|-------------|--------|---------|
| Meta Business Account (WhatsApp) | ❌ Não fornecida | Módulo F em sandbox/mock de desenvolvimento |
| Google OAuth Client (Calendar) | ❌ Não fornecida | Módulo I em sandbox local |
| Microsoft Azure App (Graph) | ❌ Não fornecida | Módulo I em sandbox local |
| Stripe Account | ❌ Não fornecida | Módulo M em modo teste simulado |
| Domínio e TLS produção | ❌ Não fornecido | Deploy produção bloqueado |
| Secret Manager produção | ❌ Não fornecido | Deploy produção bloqueado |

Todos os adapters serão implementados com interface completa. Blockers registrados em `docs/release/EXTERNAL_BLOCKERS.md`.

---

## 6. Riscos Identificados

1. **Aprovação Meta Business** — processo pode levar semanas; testar com sandbox oficial da Meta
2. **Double booking** — requer lock distribuído; implementar com Redis SETNX + TTL
3. **Isolamento de tenant no RAG** — filtros devem ser aplicados antes do retrieval, não depois
4. **Prompt injection via documentos** — separar camadas de instrução estritamente
5. **LGPD/consentimento** — modelo de consentimento deve ser revisado por advogado antes do launch

---

## 7. Próximos Passos (Sprint 0)

1. ✅ CLAUDE.md
2. ✅ Estrutura de diretórios
3. 🔄 package.json raiz + pnpm-workspace.yaml
4. 🔄 Turborepo config
5. 🔄 TypeScript configs compartilhadas
6. 🔄 ESLint + Prettier configs
7. 🔄 Docker Compose (PostgreSQL, Redis, MinIO)
8. 🔄 CI pipeline (GitHub Actions)
9. 🔄 apps/api bootstrap (NestJS)
10. 🔄 apps/web bootstrap (Next.js)
11. 🔄 Migration inicial (Tenant baseline)
12. 🔄 Test harness

**Gate Sprint 0**: build limpo, CI verde, arquitetura documentada, riscos identificados.
