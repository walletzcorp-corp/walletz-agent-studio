# Status da Release — Walletz Agent Studio

**Última atualização**: 2026-11-05  
**Sprint atual**: fix/production-readiness — isolamento multi-tenant, WhatsApp→agenda, tools do agente

---

## Sumário

| Estado | Itens |
|--------|-------|
| ✅ Isolamento de tenant | Guard global deny-by-default (`AccessPolicyGuard`), `TenantContext` único e imutável, predicados `tenantId` em services, `TenantOwnershipService` para ids vindos do corpo. Matriz: 112 rotas, 1760 ataques, 0 FAIL — [TENANT_ISOLATION_MATRIX.md](../qa/TENANT_ISOLATION_MATRIX.md) |
| ✅ WhatsApp → agenda | Conta resolvida por `phone_number_id` único, HMAC obrigatório (fail-closed), agente só se atribuído e publicado, contexto de tool imutável no servidor, `findMeetings` sempre escopado ao contato |
| ✅ Tokens de uso único | Verificação de e-mail, reset de senha e convite armazenados apenas como SHA-256; fluxo `/invites/accept` + páginas web de aceite, reset e verificação |
| ✅ Envio por número do tenant | Seleção determinística da conta de saída (conectada primeiro, depois a mais antiga) |
| ✅ CI | Job `security-e2e` em todo push/PR (Postgres + Redis, migrações completas, 4 suítes); `build` depende dele. Runs 1–6 da branch estavam vermelhos (turbo descartava `DATABASE_URL`, `--dry-run` inexistente no drizzle-kit, suíte dependia de OAuth do `.env.local`, `pnpm audit` com 5 críticas/55 altas); corrigidos — confirmar o próximo run no GitHub |
| ✅ Dependências | `pnpm audit --audit-level=high` sem achados (Next 15.5.29, drizzle-orm 0.45, zod 4, nodemailer 10, axios/multer/etc. + overrides) |
| ✅ MFA em repouso | Segredo TOTP selado com AES-256-GCM (`enc:v1:`); segredos antigos em texto são selados no primeiro login com MFA; `ENCRYPTION_KEY` obrigatória em produção |
| ✅ Worker | `apps/worker` + `QUEUE_ROLE=api|worker|all`: consumidores BullMQ e relay do outbox rodam em processo próprio (provado: job fica `waiting` só com a API e `completed` ao subir o worker) |
| ⏳ Pendente | RAG (E), Billing (M, módulo não implementado), Analytics (L) |
| 🔴 Bloqueado externamente | `ANTHROPIC_API_KEY` real (testes dependentes ficam `BLOCKED_EXTERNAL_MISSING_CREDENTIAL`), app Meta/WhatsApp em produção, consentimento Google/Microsoft, Stripe |

### Evidência executada (2026-11-05, banco E2E recriado do zero + migrações)

| Suíte | Resultado |
|-------|-----------|
| `tenant-isolation.e2e-spec.ts` (todas as rotas × papéis × tenants) | PASS |
| `whatsapp-calendar-tenant-isolation.e2e-spec.ts` | PASS (1 skip: depende de chave Anthropic real) |
| `tool-tenant-isolation.e2e-spec.ts` | PASS |
| `access-control-and-privacy.e2e-spec.ts` (RBAC, LGPD, OAuth state, workers, convites) | PASS |
| Total e2e | 137 passed, 1 skipped, 0 failed |
| Unit (`pnpm test`) | 32 passed |
| `pnpm lint` / `typecheck` / `format:check` / `build` | verde |

Limitações conhecidas: testes que exigem o modelo real ficam bloqueados até existir chave válida; o relay do outbox usa `FOR UPDATE SKIP LOCKED` fora de transação, então deve rodar em uma única instância de worker até ser movido para dentro de uma transação.

---

## Tabela de Módulos

| Módulo | Status | Testes | Integração Real | Blockers | Riscos | Evidência | Responsável Lógico | Última Validação |
|--------|--------|--------|----------------|----------|--------|-----------|-------------------|-----------------|
| **Sprint 0 — Fundação** | 🔄 Em progresso | — | — | — | — | — | Arquitetura | 2026-10-05 |
| Monorepo setup | 🔄 | — | — | — | — | — | DevOps | 2026-10-05 |
| Docker Compose dev | ⏳ | — | N/A | — | — | — | DevOps | — |
| CI GitHub Actions | ⏳ | — | N/A | — | — | — | DevOps | — |
| CLAUDE.md | ✅ | N/A | N/A | — | — | arquivo criado | Arquitetura | 2026-10-05 |
| PRODUCT_SPEC.md | ✅ | N/A | N/A | — | — | arquivo criado | Product | 2026-10-05 |
| ARCHITECTURE.md | ✅ | N/A | N/A | — | — | arquivo criado | Arquitetura | 2026-10-05 |
| THREAT_MODEL.md | ✅ | N/A | N/A | — | — | arquivo criado | Security | 2026-10-05 |
| ADRs 001-007 | ⏳ | N/A | N/A | — | — | — | Arquitetura | — |
| **Módulo A — Tenancy/Auth** | ⏳ | — | — | — | MFA implementation | — | Backend | — |
| **Módulo B — Agentes** | ⏳ | — | — | — | — | — | Backend/Frontend | — |
| **Módulo C — Teach AI** | ⏳ | — | — | — | Prompt injection risk | — | AI/Backend | — |
| **Módulo D — Laboratório** | ⏳ | — | — | — | — | — | AI/QA | — |
| **Módulo E — Inbox** | ⏳ | — | — | — | — | — | Backend/Frontend | — |
| **Módulo F — WhatsApp** | 🔴 Bloqueado | — | Sandbox oficial | Conta Meta Business | Aprovação Meta | — | Integrations | — |
| **Módulo G — Contatos** | ⏳ | — | — | — | LGPD/consentimento | — | Backend | — |
| **Módulo H — Campanhas** | ⏳ | — | — | — | Spam risk | — | Backend | — |
| **Módulo I — Agenda** | 🟢 Funcional | 10/12 ✅ | Microsoft Graph REAL | Admin Consent Application permissions; ANTHROPIC_API_KEY | — | Reunião+joinUrl Teams criada, reagendada, cancelada; auto-refresh token implementado; 10 testes automáticos passando | Integrations | 2026-10-06 |
| **Módulo J — Tools** | ⏳ | — | — | — | Tool abuse | — | AI/Backend | — |
| **Módulo K — Learning** | ⏳ | — | — | — | Auto-learning risk | — | AI | — |
| **Módulo L — Analytics** | ⏳ | — | — | — | — | — | Backend | — |
| **Módulo M — Billing** | 🔴 Bloqueado | — | Stripe Test Mode | Stripe Account | — | — | Backend | — |
| **Módulo N — Admin** | ⏳ | — | — | — | — | — | Backend | — |

---

## Progresso Sprint 0

- [x] Git init
- [x] CLAUDE.md
- [x] docs/product/PRODUCT_SPEC.md
- [x] docs/product/IMPLEMENTATION_BASELINE.md
- [x] docs/architecture/ARCHITECTURE.md
- [x] docs/architecture/THREAT_MODEL.md
- [x] docs/release/STATUS.md (este arquivo)
- [ ] docs/architecture/adr/ADR-001 a ADR-007
- [ ] package.json raiz (pnpm workspaces)
- [ ] pnpm-workspace.yaml
- [ ] turbo.json
- [ ] packages/config (tsconfig, eslint, prettier)
- [ ] apps/api (NestJS bootstrap)
- [ ] apps/web (Next.js bootstrap)
- [x] apps/worker (bootstrap em `apps/api/src/worker.ts`, pacote `@walletz/worker`)
- [ ] infra/docker/docker-compose.yml
- [ ] .env.example
- [ ] .github/workflows/ci.yml
- [ ] Migration inicial (schema tenant baseline)
- [ ] Test harness baseline

**Gate Sprint 0**: Build limpo, CI verde, arquitetura documentada, riscos identificados.  
**Status do gate**: 🔄 Em progresso

---

## Blockers Externos

Ver detalhes em [EXTERNAL_BLOCKERS.md](EXTERNAL_BLOCKERS.md).

| Blocker | Módulo | O que precisamos |
|---------|--------|-----------------|
| Meta Business Account aprovada | F | Conta Meta Business + WABA aprovada |
| Google OAuth Client | I | Google Cloud Project + credenciais OAuth |
| Microsoft Azure App | I | Azure AD App Registration ✅ já configurado. Pendente: Application permissions (Calendars.ReadWrite, OnlineMeetings.ReadWrite.All, User.Read.All) + admin consent |
| ANTHROPIC_API_KEY real | D/Lab | Chave real em apps/api/.env.local para habilitar testes de agente conversacional |
| Stripe Account | M | Stripe account (test mode suficiente para dev) |
| Domínio produção | Deploy | Domínio + certificado TLS |
