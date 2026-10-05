# Status da Release — Walletz Agent Studio

**Última atualização**: 2026-10-05  
**Sprint atual**: 3 — Sprint 2 concluído, infraestrutura de dev validada

---

## Sumário

| Estado | Módulos |
|--------|---------|
| ✅ Pronto | Sprint 0 — Fundação, Sprint 1 — Auth/RBAC/Tenancy/Design System, Sprint 2 — Agent Builder |
| ✅ Validado em dev | Register, Login, Logout, Dashboard, Tenant isolation — testados no browser e via API |
| ⏳ Pendente | Knowledge (C), Teach AI (D), RAG (E), Lab (F), Conversations (G), Contacts (H), Calendar (J), Campaigns (K), Analytics (M), Billing (N) |
| 🔴 Bloqueado externamente | WhatsApp Cloud API, Google OAuth, Microsoft OAuth, Stripe |

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
| **Módulo I — Agenda** | 🔴 Bloqueado | — | Sandbox local | Google/Microsoft OAuth | Registro de app | — | Integrations | — |
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
| Microsoft Azure App | I | Azure AD App Registration |
| Stripe Account | M | Stripe account (test mode suficiente para dev) |
| Domínio produção | Deploy | Domínio + certificado TLS |
