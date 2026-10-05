# External Blockers — Walletz Agent Studio

**Data**: 2026-10-05

Dependências externas que requerem ação do proprietário do produto antes da validação final em produção. O produto está implementado com adapters completos e testes em sandbox/mock onde disponível.

---

## BLOCKER-001 — Meta Business Account (WhatsApp Cloud API)

**Módulo afetado**: F — WhatsApp Business Platform  
**Status**: BLOQUEADO — aguardando credenciais do proprietário

**O que precisa ser fornecido**:
1. Meta Business Account aprovada
2. WhatsApp Business Account (WABA) aprovada
3. Número de telefone WhatsApp Business verificado
4. `WHATSAPP_ACCESS_TOKEN` (System User Token com permissão `whatsapp_business_messaging`)
5. `WHATSAPP_PHONE_NUMBER_ID` do número aprovado
6. `WHATSAPP_WABA_ID` da conta WABA
7. `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (string secreta definida por você)
8. URL de webhook configurada no painel Meta: `https://<domínio>/webhooks/meta/whatsapp`

**Como validar após fornecer**:
```bash
# Verificar webhook (Meta faz GET com challenge)
# O sistema responde automaticamente ao challenge

# Testar envio (sandbox Meta disponível para desenvolvimento)
pnpm --filter @walletz/api test:integration -- whatsapp
```

**Estado atual**: Adapter implementado, webhook handler implementado, Send Policy Gateway implementado. Testes usando Meta Cloud API Test Environment quando disponível. Documentação: `docs/integrations/WHATSAPP_SETUP.md`.

---

## BLOCKER-002 — Google OAuth Client (Calendar)

**Módulo afetado**: I — Agenda Google  
**Status**: BLOQUEADO — aguardando credenciais do proprietário

**O que precisa ser fornecido**:
1. Google Cloud Project criado
2. Google Calendar API habilitada no projeto
3. `GOOGLE_CLIENT_ID` (OAuth 2.0 Client ID)
4. `GOOGLE_CLIENT_SECRET` (OAuth 2.0 Client Secret)
5. Redirect URI registrado: `https://<domínio>/api/calendars/google/callback`
6. Escopos necessários solicitados no OAuth consent screen:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`

**Como criar**:
1. Acesse console.cloud.google.com
2. Crie projeto "Walletz Agent Studio"
3. APIs & Services → Enable APIs → Google Calendar API
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs: adicione o URI acima

**Estado atual**: OAuth flow implementado, CalendarService implementado, disponibilidade engine implementada. Testes com mock de Google Calendar em CI.

---

## BLOCKER-003 — Microsoft Azure App Registration (Graph API)

**Módulo afetado**: I — Agenda Microsoft 365  
**Status**: BLOQUEADO — aguardando credenciais do proprietário

**O que precisa ser fornecido**:
1. Azure Active Directory tenant ou conta Microsoft pessoal
2. `MICROSOFT_CLIENT_ID` (Application ID)
3. `MICROSOFT_CLIENT_SECRET`
4. `MICROSOFT_TENANT_ID` (use "common" para multi-tenant)
5. Redirect URI registrado: `https://<domínio>/api/calendars/microsoft/callback`
6. Permissões Microsoft Graph (Application ou Delegated):
   - `Calendars.ReadWrite`
   - `User.Read`
   - `OnlineMeetings.ReadWrite` (para Teams meetings)

**Como criar**:
1. Acesse portal.azure.com → Azure Active Directory → App Registrations
2. New registration: "Walletz Agent Studio"
3. Redirect URI: Web + URI acima
4. Certificates & secrets → New client secret
5. API permissions → Add permission → Microsoft Graph → Delegated

**Estado atual**: OAuth flow implementado, MicrosoftCalendarService implementado. Testes com mock em CI.

---

## BLOCKER-004 — Stripe Account (Billing)

**Módulo afetado**: M — Billing e planos  
**Status**: BLOQUEADO — aguardando conta

**O que precisa ser fornecido**:
1. Conta Stripe criada (modo teste suficiente para desenvolvimento/staging)
2. `STRIPE_SECRET_KEY` (sk_test_... para dev/staging)
3. `STRIPE_PUBLISHABLE_KEY` (pk_test_...)
4. `STRIPE_WEBHOOK_SECRET` (whsec_... gerado ao criar endpoint de webhook)
5. Webhook endpoint registrado no Stripe: `https://<domínio>/webhooks/stripe`
6. Eventos configurados no webhook:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

**Estado atual**: BillingService implementado com abstração de provider. StripeAdapter implementado. Testes usando Stripe Test Mode. Planos configurados como objetos no banco (não hardcoded).

**Nota sobre PIX**: Stripe suporta PIX no Brasil. Habilitar em conta Stripe → Settings → Payment methods → PIX.

---

## BLOCKER-005 — Domínio e Certificado TLS (Produção)

**Módulo afetado**: Deploy em produção  
**Status**: BLOQUEADO

**O que precisa ser fornecido**:
1. Domínio registrado (ex: `agentestudio.walletz.com.br`)
2. DNS apontado para o servidor/load balancer
3. TLS: Let's Encrypt (gratuito) ou certificado comercial

**Impacto**: Sem domínio, WhatsApp webhook não pode ser configurado na Meta (requer HTTPS com domínio real).

---

## BLOCKER-006 — Secret Manager (Produção)

**Módulo afetado**: Deploy em produção  
**Status**: BLOQUEADO

**Recomendação**: Doppler, AWS Secrets Manager, ou Google Secret Manager.

**O que configurar**:
- Todas as variáveis de `.env.example` com valores reais de produção
- Rotação automática de tokens quando suportada
- Access control por ambiente (dev/staging/prod)

---

## Como Retomar Após Desbloquear

Para cada blocker, após fornecer as credenciais:

1. Adicione as variáveis em `.env.local` (desenvolvimento) ou no secret manager (staging/produção)
2. Execute os testes de integração específicos do módulo
3. Valide no sandbox oficial quando disponível
4. Atualize `docs/release/STATUS.md` com status e evidência
5. Execute o gate completo da sprint correspondente

**Contato para dúvidas**: ia@walletzcorp.com
