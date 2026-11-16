# Status da Release — Walletz Agent Studio

**Última atualização**: 2026-11-16  
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

---

## Administração da plataforma (2026-11-12)

| Item | Status | Evidência |
|------|--------|-----------|
| Admin da plataforma (`users.is_platform_admin`) | ✅ | migration 0004; script `dist/database/scripts/create-platform-admin.js` |
| API `/v1/admin/*` (overview, tenants, agents, users, activity, llm) | ✅ | `PlatformAdminGuard` consulta o banco a cada requisição |
| Ações: suspender, reativar, estender trial, limite mensal de tokens | ✅ | auditadas (`admin.tenant.*`) com estado anterior/novo |
| Suspensão bloqueia o tenant | ✅ | `RbacGuard` → 403 `TENANT_SUSPENDED` |
| Consumo de LLM por tenant | ✅ | `usage_events` (`llm.input_tokens` / `llm.output_tokens`) gravado pelo laboratório |
| Limites de taxa da conta Anthropic | ✅ | headers `anthropic-ratelimit-*` da última resposta (Redis) |
| Limite mensal de tokens por tenant | ✅ | `tenants.llm_monthly_token_limit`; laboratório responde 429 ao atingir |
| Painel web `/admin` (dados reais, sem mock) | ✅ | dashboard, clientes, detalhe+ações, agentes, usuários, atividade, IA |
| **Correção de segurança**: isolamento de tenant no `RbacGuard` | ✅ | rotas com `:tenantId` sem `@Roles` (lab, contatos, conversas, campanhas) não checavam vínculo; header `x-tenant-slug` podia divergir da URL |
| Testes | ✅ | unit (guards, parser de rate limit) + E2E local 24/24 |
| Cadastro público fechado | ✅ | `POST /v1/auth/register` → 403 salvo `ALLOW_PUBLIC_SIGNUP=true`; telas de cadastro (`/auth/register`, `/register`, `/cadastro`) e "Criar conta" do login levam ao WhatsApp da equipe (`NEXT_PUBLIC_SALES_WHATSAPP`, padrão 5541992939892) |
| Admin cria contas de clientes (`POST /v1/admin/users`) | ✅ | botão "Novo usuário" em `/admin/usuarios`; e-mail já verificado; auditado como `admin.user.created`; e-mail repetido → 409 |
| Botão "Sair" no cabeçalho do painel | ✅ | |
| Conectar agenda (Google/Microsoft): botão corrigido | ✅ | antes abria a rota da API direto no navegador (sem token → 401); agora `GET .../calendars/:provider/authorize` devolve `{ url }` e o front redireciona; erros em português na tela |
| **Correção de segurança**: `state` do OAuth de agenda | ✅ | antes era o tenant em base64 (forjável: ligar uma agenda a outra organização); agora é código aleatório de uso único no Redis (10 min) com tenant/usuário/provedor |
| Credenciais Google/Microsoft em produção | ⏳ | faltam `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI` no `api.env` |
| Criação da organização no primeiro acesso (`/auth/organizacao`) | ✅ | antes não havia tela para criar o tenant: usuário novo ficava com todas as telas do painel carregando; o layout do painel agora redireciona quem não tem organização |

## Documentação da API (2026-11-13)

| Item | Status | Evidência |
|------|--------|-----------|
| Swagger somente local | ✅ | desligado com `NODE_ENV=production/staging` (rotas nem registradas) + só responde a Host `localhost`/`127.0.0.1`/`[::1]`; testado: produção → 404 em `/api/docs` e `/api/docs-json` até via localhost; dev com Host público → 404 |
| Todas as rotas descritas | ✅ | 121 rotas em 16 módulos, 0 sem resumo |
| Documentação gerada | ✅ | `docs/api/openapi.json` + `docs/api/REFERENCE.md` via `pnpm --filter @walletz/api docs:openapi`; guia em `docs/api/README.md` |
| Testes | ✅ | `shared/docs/__tests__/swagger.spec.ts` (6) |

## Cadastro de clientes PF/PJ pelo admin (2026-11-16)

| Item | Status | Evidência |
|------|--------|-----------|
| Tipo de cliente PF/PJ, CPF/CNPJ e telefone na organização | ✅ | migration `0005_customer-type` (padrão `pj` para as existentes); documento único entre clientes ativos |
| `POST /v1/admin/tenants` cria organização + login do responsável + vínculo de dono numa transação | ✅ | e-mail já existente é vinculado sem trocar a senha; trial de 14 dias; auditado como `admin.tenant.created` com CPF mascarado |
| Validação de CPF/CNPJ (dígitos verificadores) no servidor e no front | ✅ | `shared/validation/tax-id.ts`; 400 "CPF inválido" / 409 "Já existe um cliente com este CPF." |
| Painel `/admin/clientes`: botão "Novo cliente", filtro PF/PJ, coluna tipo/documento, busca por CPF/CNPJ | ✅ | CPF mascarado na lista (`***.456.789-**`), completo só no detalhe |
| Testes | ✅ | unit 10 (CPF/CNPJ + DTO); E2E API 13/13 com banco real (inclui 403 para não-admin e campo extra recusado); navegador 6/6 |

## Planos v4.2 e chave de IA do próprio cliente (BYOK) (2026-11-16)

Base: *Walletz Studio IA — Planos Sugeridos*, proposta comercial v4.2 (16/11/2026). Regra central: nenhum plano inclui tokens de IA.

| Item | Status | Evidência |
|------|--------|-----------|
| Chave de IA por cliente (Anthropic, OpenAI, Gemini, OpenRouter) | ✅ | tabela `ai_provider_connections` (migration `0006_byok-planos`), chave AES-256-GCM, só a máscara sai da API; validação com listagem de modelos + chamada mínima de teste |
| Chave geral da plataforma removida | ✅ | `LabService` usa `AiProvidersService.resolveForAgent`; sem conexão → 422 `AI_PROVIDER_NOT_CONFIGURED`; `ANTHROPIC_API_KEY` não é mais lida |
| Testar / trocar (rotação validada) / revogar (apaga a chave cifrada) / modelo / conexão padrão / conexão por agente | ✅ | `/v1/tenants/:id/ai-connections/*`; auditoria `ai_connection.*` sem a chave |
| "Provedor de IA indisponível por faturamento" | ✅ | falha de crédito/quota marca `billing_error` e bloqueia novas chamadas (402) sem bloquear o painel; "Testar novamente" reativa |
| Planos Starter/Pro/Business/Agency no banco e no código | ✅ | `shared/plans/plan-catalog.ts` + seed na migration; clientes sem plano/legados → Starter |
| Limites aplicados no servidor | ✅ | agentes, usuários (convite), conexões de IA, números de WhatsApp, agendas, widgets, webhooks → 403 `PLAN_LIMIT_REACHED` |
| Recursos por plano | ✅ | WhatsApp/agendas fora do Starter, webhooks a partir do Pro, campanhas em massa fora dos planos (só "sob medida" liberado pelo admin) |
| Admin: plano no cadastro, troca de plano, recursos sob medida, painel de chaves dos clientes | ✅ | `PATCH /v1/admin/tenants/:id/plan` e `/features`; `/admin/ia` lista conexões (sem chaves) e clientes sem chave |
| Webchat incorporável (canal do Starter) | ✅ | widgets por agente, sites autorizados (Origin), token de sessão por conversa, limite por IP e por sessão; script `GET /v1/public/webchat/widget.js` |
| Webhooks de saída (Pro+) | ✅ | assinatura HMAC-SHA256, entrega com novas tentativas pelo outbox, bloqueio de rede interna (SSRF) |
| Telas Billing, Custos, Integrações, Config. IA, Ajuda e cadastro | ✅ | sem valores fictícios; IA sempre "paga direto ao provedor" |
| Testes | ✅ | unit 86 (planos, adaptadores, BYOK, webhooks/webchat); E2E local 38/38 com banco real e chave real (inclui isolamento entre clientes) |
| Notificações por e-mail, caixa de e-mail, Trello/CRM, API pública | ⏳ Em desenvolvimento | aparecem como roadmap; o servidor bloqueia com `FEATURE_IN_DEVELOPMENT` |
| Subcontas e White Label (Agency) | ⏳ Oferta condicionada | depende de validar isolamento, permissões, faturamento por subconta e vazamento de chaves (seção 06 do documento) |
| Cobrança da assinatura (checkout) | ⏳ | contratação via Walletz (WhatsApp/contrato); módulo billing sem gateway |

## WhatsApp com o app Meta do próprio cliente (2026-11-16)

| Item | Status | Evidência |
|------|--------|-----------|
| Conexão com credenciais do cliente (Phone Number ID, WABA ID, App ID, App Secret, token permanente) | ✅ | validação real na Meta (`debug_token`, permissão `whatsapp_business_messaging`, número pertence à WABA) antes de salvar; token e App Secret cifrados |
| Webhook exclusivo por número | ✅ | `GET/POST /v1/webhook/whatsapp/:accountId`; token de verificação gerado por número; assinatura obrigatória com o App Secret do cliente; eventos de outros números ignorados (migration `0007_whatsapp-cliente`) |
| Agente por número | ✅ | `PATCH …/whatsapp/accounts/:id/agent`; sem agente definido, o primeiro publicado |
| Troca de token / App Secret validada | ✅ | `PUT …/whatsapp/accounts/:id/credentials` |
| Listagem não expõe segredos | ✅ | antes a API devolvia token e App Secret cifrados; agora só a visão segura |
| Webhook global (app Walletz) sem `META_APP_SECRET` em produção | ✅ | recusado (antes aceitava eventos sem assinatura) |
| `@CurrentUser('userId')` devolvia o objeto inteiro | ✅ corrigido | afetava WhatsApp, conversas, contatos, campanhas e privacidade (id do usuário errado em gravações e auditoria) |
| Testes | ✅ | E2E local 19/19 (inclui recusa real da Meta para credenciais falsas, assinatura, isolamento) |
| Teste com número real da Meta | ⏳ | depende de credenciais reais do cliente e de URL pública (`PUBLIC_API_URL`) |
