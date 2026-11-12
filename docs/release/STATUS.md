# Status da Release — Walletz Agent Studio

**Última atualização**: 2026-11-11  
**Sprint atual**: 7 — Microsoft Graph Integration + Token Auto-Refresh + Teams Meeting

---

## Sumário

| Estado | Módulos |
|--------|---------|
| ✅ Pronto | Sprint 0–2 — Fundação, Auth/RBAC/Tenancy, Agent Builder |
| ✅ Validado em dev | Auth flow, Agents, Knowledge Ingestion (Sprint 3), Teach AI + Approval (Sprint 4) |
| ⏳ Pendente | RAG (E), Lab (F), Conversations (G), Contacts (H), Calendar (J), Campaigns (K), Analytics (M), Billing (N) |
| 🔴 Bloqueado externamente | WhatsApp Cloud API, Google OAuth, Microsoft OAuth, Stripe |

---

## Tabela de Módulos

| Módulo | Status | Testes | Integração Real | Blockers | Riscos | Evidência | Responsável Lógico | Última Validação |
|--------|--------|--------|----------------|----------|--------|-----------|-------------------|-----------------|
| **Sprint 0 — Fundação** | 🔄 Em progresso | — | — | — | — | — | Arquitetura | 2026-10-05 |
| Monorepo setup | 🔄 | — | — | — | — | — | DevOps | 2026-10-05 |
| Docker Compose dev | ⏳ | — | N/A | — | — | — | DevOps | — |
| CI GitHub Actions | ✅ | typecheck, unit, migrations, build | N/A | — | lint/format ainda informativos | ci.yml + deploy.yml | DevOps | 2026-11-11 |
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
- [ ] apps/worker (NestJS worker bootstrap)
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

---

## Deploy e CI (2026-11-11)

| Item | Status | Observação |
|------|--------|------------|
| Produção (servidor 193.203.15.139) | ✅ no ar | stack `walletz-infra/prod/agent-studio`; aguardando DNS + TLS de agent-studio.walletzcorp.com |
| CI bloqueante | ✅ | typecheck (4 pacotes), testes unitários, migrations em banco limpo (2x), build |
| Typecheck web | ✅ 0 erros | checagem religada no `next build` |
| Lint | 🔴 | ESLint 9 sem `eslint.config.js`; job informativo |
| Format | 🔴 | ~250 arquivos fora do Prettier; job informativo |
| Testes unitários | 🔴 | API e web sem testes unitários |
| Suíte de isolamento de tenant | 🔴 | não compila no jest (`@nestjs/bullmq` é ESM); fora do CI |
