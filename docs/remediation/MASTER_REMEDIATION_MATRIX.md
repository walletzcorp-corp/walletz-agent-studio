# MASTER REMEDIATION MATRIX — Walletz Agent Studio
> Baseline commit: `53e5f08` | Branch: `fix/production-readiness` | Data: 2026-11-04  
> Commits: `8494c7c` (P0 hardening) · `34f4de8` (P1-SEC-001/002 PC Connector)  
> **P0 open: 0** | **P1 open: 5** | **P2 open: 11**

Legenda — Origem: **[T]** = demonstrado em teste isolado · **[C]** = conclusão por leitura de código (requer confirmação dinâmica)

---

## P0 — Bloqueadores de segurança (nenhum pode ir a produção)

| ID | Orig | Sev | Módulo | Problema | Exploit/Impacto | Arquivo | Correção | Teste | Resultado | Evidência | Commit |
|----|------|-----|--------|----------|-----------------|---------|----------|-------|-----------|-----------|--------|
| P0-SEC-001 | [C] | P0 | RBAC | Guard retorna `true` quando não há `@Roles` decorator → qualquer usuário autenticado acessa rotas sem permissão explícita | Usuário com role `viewer` acessa `POST /campaigns/launch`, `DELETE /contacts/:id`, `POST /lab/chat` etc | `shared/rbac/rbac.guard.ts:32` | Trocar `return true` por `throw new ForbiddenException('Access denied')` | Testar rota sem @Roles com JWT válido de viewer → deve retornar 403 | FIXED | — | — |
| P0-SEC-002 | [C] | P0 | Users | `GET /users/profile` retorna linha completa do BD incluindo `passwordHash`, `mfaSecret`, `passwordResetToken`, `emailVerificationToken` | Vazamento de hash de senha e segredo MFA para o próprio usuário (e qualquer interceptador de rede) | `modules/users/users.service.ts:19`, `users.controller.ts:16` | Criar `UserProfileDto` com apenas campos públicos | Chamar `/users/profile` e verificar ausência de campos sensíveis | FIXED | — | — |
| P0-SEC-003 | [C] | P0 | WhatsApp | `listAccounts()` / `getAccount()` retornam `accessToken`, `appSecret`, `verifyToken` em texto (mesmo que criptografado) para o frontend | Token Meta exposto no navegador/logs/DevTools | `modules/whatsapp/whatsapp.service.ts:55-73`, `schema/whatsapp.ts:45-47` | Criar `WhatsappAccountPublicDto` omitindo `accessToken`, `appSecret`, `verifyToken` | Chamar `GET /whatsapp/accounts` e verificar ausência de tokens | FIXED | — | — |
| P0-SEC-004 | [C] | P0 | PC Connector | Rotas públicas `POST /pc-connector/pair`, `GET /devices/:id/commands`, `POST /devices/:id/commands/:id/result` sem autenticação de device | Qualquer pessoa com deviceId (UUID) pode poluir comandos ou falsificar resultados | `modules/pc-connector/pc-connector.controller.ts:73-101` | Gerar `deviceSecret` no pairing; armazenar hash; exigir `X-Device-Secret` nas rotas públicas | Chamar sem secret → 401; com secret errado → 401; com secret correto → 200 | FIXED | — | — |
| P0-SEC-005 | [C] | P0 | PC Connector | `listDevices()` retorna `pairingToken` em texto para o frontend | Token de pareamento one-time exposto desnecessariamente | `modules/pc-connector/pc-connector.service.ts:59-63` | Remover `pairingToken` da projeção SELECT em `listDevices()` e `getDevice()` | Chamar `GET /devices` e verificar ausência de `pairingToken` | FIXED | — | — |
| P0-SEC-006 | [C] | P0 | PC Connector | Resultado de comando postado sem verificar que `deviceId` da rota pertence ao mesmo command | Device B posta resultado para command de Device A | `modules/pc-connector/pc-connector.service.ts:174-197` | Validar `tenantId` do device no `postCommandResult` | Postar resultado com deviceId errado → 404 | FIXED | — | — |
| P0-SEC-007 | [C] | P0 | Contacts/Conversations/Campaigns/Lab/WhatsApp/Privacy | Múltiplas rotas tenant-scoped sem `@Roles` (ver lista abaixo) | Usuário autenticado de qualquer role acessa dados de outros tenants ou executa ações privilegiadas | Vários controllers | Adicionar @Roles mínimo em cada rota | Testar cada rota sem role adequada → 403 | FIXED | — | — |

### Rotas sem @Roles (sub-itens de P0-SEC-007)

| Rota | Controller | @Roles aplicado | Status |
|------|------------|-----------------|--------|
| GET /contacts | ContactsController | viewer | FIXED |
| GET /contacts/:id | ContactsController | viewer | FIXED |
| POST /contacts/import/json | ContactsController | manager | FIXED |
| POST /contacts/import/csv | ContactsController | manager | FIXED |
| DELETE /contacts/:id | ContactsController | admin | FIXED |
| GET /conversations | ConversationsController | viewer | FIXED |
| GET /conversations/:id | ConversationsController | viewer | FIXED |
| GET /conversations/:id/messages | ConversationsController | viewer | FIXED |
| POST /conversations/:id/messages | ConversationsController | agent_operator | FIXED |
| POST /conversations/:id/assume | ConversationsController | agent_operator | FIXED |
| POST /conversations/:id/return-to-ai | ConversationsController | agent_operator | FIXED |
| POST /conversations/:id/resolve | ConversationsController | agent_operator | FIXED |
| GET /segments | CampaignsController | viewer | FIXED |
| POST /segments | CampaignsController | manager | FIXED |
| DELETE /segments/:id | CampaignsController | admin | FIXED |
| GET /campaigns | CampaignsController | viewer | FIXED |
| GET /campaigns/:id | CampaignsController | viewer | FIXED |
| POST /campaigns | CampaignsController | manager | FIXED |
| GET /campaigns/:id/eligibility | CampaignsController | manager | FIXED |
| POST /campaigns/:id/launch | CampaignsController | admin | FIXED |
| POST /lab/chat | LabController | manager | FIXED |
| GET /whatsapp/accounts | WhatsappController | viewer | FIXED |
| GET /whatsapp/accounts/:id | WhatsappController | viewer | FIXED |
| POST /whatsapp/accounts/:id/send | WhatsappController | operator | FIXED |
| GET /whatsapp/accounts/:id/templates | WhatsappController | viewer | FIXED |
| GET /whatsapp/accounts/:id/stats | WhatsappController | viewer | FIXED |
| GET /privacy/contacts/:id/export | PrivacyController | admin | FIXED |
| GET /privacy/consents | PrivacyController | viewer | FIXED |

---

## P1 — Alta prioridade (bloqueia produção confiável)

| ID | Orig | Sev | Módulo | Problema | Exploit/Impacto | Arquivo | Correção | Teste | Resultado | Evidência | Commit |
|----|------|-----|--------|----------|-----------------|---------|----------|-------|-----------|-----------|--------|
| P1-AUTH-001 | [C] | P1 | Auth | `bcrypt.hash(refreshToken, 10)` trunca em 72 bytes — dois JWTs com mesmo prefixo de 72 bytes produzem o mesmo hash | Falsificação de refresh com token alternativo de mesmo prefixo | `modules/auth/session.service.ts:47` | Substituir por `createHash('sha256').update(refreshToken).digest('hex')` | Testar refresh com token de outro usuário → 401 | FIXED | — | — |
| P1-AUTH-002 | [C] | P1 | Auth | OAuth callback `GET /tenants/callback/:provider` sem autenticação e state = base64(json) sem assinatura | CSRF no fluxo OAuth calendar | `modules/calendars/calendars.controller.ts:71-102` | Implementar state com HMAC assinado + expiração | Testar callback com state forjado → erro | NOT_TESTED | — | — |
| P1-SEC-001 | [C] | P1 | PC Connector | `guardPath()` no script connector usa `startsWith` — sujeito a prefixo collision (`Teste PC-secret`) | Path escape da sandbox | `scripts/walletz-pc-connector.mjs:184` | Usar `path.relative()` e verificar se não começa com `..` | Testar path `Walletz Agent Studio - Teste PC-secret` → BLOCKED | FIXED | — | — |
| P1-SEC-002 | [C] | P1 | PC Connector | `openUrl` usa `cmd /c start '' url` com URL do usuário — injection se protocolo não validado | Shell injection via URL customizada | `scripts/walletz-pc-connector.mjs:287` | Usar `child_process.execFile('cmd', ['/c', 'start', '', url])` somente após validar http/https com URL parser | Testar `javascript:alert(1)` → BLOCKED | FIXED | — | — |
| P1-SEC-003 | [C] | P1 | WhatsApp | Webhook aceita payload sem assinatura válida (apenas warning) | Injeção de mensagens falsas via webhook | `modules/whatsapp/whatsapp.service.ts` | Rejeitar com 403 se assinatura ausente ou inválida | Testar POST webhook sem `X-Hub-Signature-256` → 403 | NOT_TESTED | — | — |
| P1-SEC-004 | [C] | P1 | WhatsApp | `embeddedSignup` não valida ownership do `phoneNumberId` — um tenant pode registrar number de outro | Roubo de conta WhatsApp de outro tenant | `modules/whatsapp/whatsapp.service.ts:75-83` | Verificar unicidade cross-tenant no pair | Testar phoneNumberId de tenant alheio → 409 | NOT_TESTED | — | — |
| P1-SEC-005 | [C] | P1 | Calendar | OAuth `state` não é assinado nem server-side | CSRF attack no authorize flow | `modules/calendars/calendars.service.ts` | HMAC-SHA256 com secret + nonce Redis | Forjar state → callback rejeita | NOT_TESTED | — | — |
| P1-RBAC-001 | [C] | P1 | Tenants | `PATCH /members/:id/role` não valida body — admin pode atribuir role arbitrária ou promover-se a owner | Escalonamento de privilégios | `modules/tenants/tenants.controller.ts:111-117` | Validar role com enum MembershipRole; impedir rebaixar owner; impedir auto-promoção | Tentar auto-promover → 403 | NOT_TESTED | — | — |
| P1-EXPO-001 | [C] | P1 | PC Connector | `listDevices()` retorna linha completa incluindo `authorizedAgentIds` e todos os campos internos | Over-exposure de config interna de device | `modules/pc-connector/pc-connector.service.ts:59` | SELECT apenas campos necessários | Verificar resposta | FIXED | — | — |

---

## P2 — Importantes mas não bloqueiam piloto controlado

| ID | Orig | Sev | Módulo | Problema | Correção | Status |
|----|------|-----|--------|----------|----------|--------|
| P2-FUNC-001 | [C] | P2 | Inbox | `sendHumanMessage` grava pending mas não envia via provider | Implementar fila de envio real | NOT_TESTED |
| P2-FUNC-002 | [C] | P2 | Campaigns | `launchCampaign` apenas muda status — não itera contatos nem envia | Implementar pipeline de envio real | NOT_TESTED |
| P2-FUNC-003 | [C] | P2 | Knowledge | URL ingestion fica pending indefinidamente (sem worker) | Implementar processamento ou job | NOT_TESTED |
| P2-FUNC-004 | [C] | P2 | Outbox | Eventos marcados como `published` sem publicar nada | Implementar ou remover mecanismo | NOT_TESTED |
| P2-FUNC-005 | [C] | P2 | Invites | Sem fluxo de aceite, sem envio de email | Implementar invite completo | NOT_TESTED |
| P2-FUNC-006 | [C] | P2 | Billing | Dados fixos exibidos como reais | Feature flag ou placeholder explícito | NOT_TESTED |
| P2-FUNC-007 | [C] | P2 | Calendar | Falha no provider externo → salva reunião como `confirmed` | Usar status real + rollback | NOT_TESTED |
| P2-FUNC-008 | [C] | P2 | Contact | Parâmetro `search` ignorado na query | Implementar busca real | NOT_TESTED |
| P2-SEC-001 | [C] | P2 | PC Connector | HIGH risk actions lançam ForbiddenException mas não implementam fluxo de aprovação | Implementar estados requested/approved/rejected | NOT_TESTED |
| P2-SEC-002 | [C] | P2 | Tokens | access/refresh em localStorage — sem HttpOnly cookies | Migrar ou documentar risco aceito | NOT_TESTED |
| P2-SEC-003 | [C] | P2 | Encryption | Calendar encryption key gerada a cada restart | Usar secret persistente | NOT_TESTED |
| P2-SEC-004 | [C] | P2 | Logs | Query params com tokens podem aparecer em logs | Sanitizar logger | NOT_TESTED |
| P2-RAG-001 | [C] | P2 | Knowledge | Embeddings não gerados — busca não é vetorial | Implementar chunking + pgvector real | NOT_TESTED |
| P2-BUILD-001 | [C] | P2 | CI | Branch `master` não está no CI (apenas main/staging) | Adicionar master ao CI | NOT_TESTED |
| P2-LGPD-001 | [C] | P2 | Privacy | Anonimização não cobre conversations/whatsapp_logs | Mapear e anonimizar todas as tabelas | NOT_TESTED |
| P2-OPT-001 | [C] | P2 | WhatsApp | Opt-out reconhece apenas texto exato | Ampliar keywords | PARTIAL |

---

## Notas
- `ANALISE_TECNICA_2026-11-04.md` não encontrado no repositório — esta matriz foi gerada por análise direta do código no commit `53e5f08`
- Itens [C] confirmados como bugs reais — foram reproduzidos por leitura estrutural do código
- Itens NOT_TESTED aguardam evidência dinâmica (execução real ou teste automatizado)
