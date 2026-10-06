# Checklist Meta/WhatsApp Business Platform Compliance

> Atualizado: 2026-10-06 | Versão: 1.0

## Legenda
- ✅ Implementado no código
- 🔶 EXTERNAL META APPROVAL REQUIRED
- ⏳ Aguardando configuração de ambiente

---

## 1. Credenciais e Segurança

| Item | Status | Local |
|------|--------|-------|
| Access Token criptografado em repouso (AES-256-GCM) | ✅ | `shared/crypto/encryption.service.ts` |
| App Secret nunca em logs | ✅ | `whatsapp.service.ts` — logs filtrados |
| Token nunca retornado completo via API | ✅ | `whatsapp.controller.ts` — endpoint não expõe token |
| Token nunca commitado no Git | ✅ | `.gitignore` cobre `.env.local` |
| Verify Token gerado automaticamente | ✅ | `crypto.randomBytes(32)` em `embeddedSignup` |
| Authorization Code flow no backend | ✅ | `embeddedSignup` — frontend envia code, backend troca |

## 2. Webhook

| Item | Status | Local |
|------|--------|-------|
| Validação de assinatura `x-hub-signature-256` | ✅ | `whatsapp.service.ts:handleWebhookEvent` |
| Verify Token validado no GET de verificação | ✅ | `whatsapp.service.ts:verifyWebhook` |
| Raw body preservado para validação HMAC | ✅ | `RawBodyRequest<Request>` no controller |
| Endpoint público sem autenticação JWT | ✅ | Rotas webhook fora do guard |
| HTTPS obrigatório para Meta | ⏳ | Requer configuração de tunnel/domínio |

## 3. Multi-tenancy e Isolamento

| Item | Status | Local |
|------|--------|-------|
| `tenant_id` em todas as queries WhatsApp | ✅ | `whatsapp.service.ts` — todos os selects com `tenantId` |
| Verificação de tenant na conexão de conta | ✅ | Conflito por `phoneNumberId` com check de tenant |
| Phone Number ID não pode pertencer a dois tenants | ✅ | `ConflictException` se tenantId diferente |
| Tokens isolados por tenant no banco | ✅ | Colunas `tenant_id` em `whatsapp_accounts` |

## 4. Embedded Signup v4

| Item | Status | Local |
|------|--------|-------|
| Meta JS SDK carregado dinamicamente | ✅ | `loadFBSDK()` em `canais/whatsapp/page.tsx` |
| `config_id` usado (não manual) | ✅ | `NEXT_PUBLIC_META_CONFIG_ID` |
| `response_type: 'code'` | ✅ | Frontend passa code, nunca token |
| `override_default_response_type: true` | ✅ | Configurado no `FB.login` |
| `sessionInfoVersion: '3'` | ✅ | Extras do `FB.login` |
| `featureType: 'coexistence'` para existing path | ✅ | Condicional por `path` |
| Auto-captura WABA ID | ✅ | `GET /me/businesses` no backend |
| Auto-captura Phone Number ID | ✅ | `GET /{wabaId}/phone_numbers` no backend |
| Usuário nunca digita IDs técnicos | ✅ | UI sem campos técnicos |

## 5. App Review e Business Verification

| Item | Status | Local |
|------|--------|-------|
| Meta App criado | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| Produto WhatsApp Business adicionado | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| Configuration ID Embedded Signup criado | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| Business Verification para acesso avançado | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| App Review para permissões avançadas (produção) | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| WhatsApp Business Account verificada (tenant) | 🔶 | RESPONSABILIDADE DO CLIENTE FINAL |

## 6. Permissões Necessárias

### Para desenvolvimento/teste (acesso básico — sem App Review):
- `whatsapp_business_messaging`
- `whatsapp_business_management`

### Para produção SaaS multi-tenant:
- `business_management` (Advanced Access — requer App Review)
- `whatsapp_business_messaging` (Advanced Access)
- `whatsapp_business_management` (Advanced Access)

## 7. Opt-out e Consentimento

| Item | Status | Local |
|------|--------|-------|
| Opt-out via STOP keyword | ✅ | `handleOptOut()` em `whatsapp.service.ts` |
| Mensagem de confirmação enviada ao opt-out | ✅ | Resposta automática em `handleOptOut` |
| Contato adicionado a suppressions | ✅ | `db.insert(suppressions)` |
| Consentimento revogado no opt-out | ✅ | `db.update(consents)` status = revoked |
| Consentimento expirado não aceito em campanhas | ✅ | `campaigns.service.ts:checkSingleRecipient` |
| Frequência máxima de 1 campanha/24h | ✅ | `FREQUENCY_CAP_HOURS = 24` |
| Template AUTHENTICATION bloqueado em marketing | ✅ | `BLOCKED_TEMPLATE_CATEGORIES` |

## 8. Políticas de Uso da Meta

| Item | Status | Notas |
|------|--------|-------|
| Apenas WhatsApp Business Platform (Cloud API) | ✅ | Sem whatsapp-web.js ou equivalente |
| Templates aprovados antes do envio | ✅ | Status `APPROVED` verificado |
| Janela de 24h para mensagens fora de template | ⏳ | Não implementado — futura versão |
| Taxa de opt-out monitorada | ⏳ | Painel de saúde — futura versão |

---

## Itens que Requerem Aprovação Externa

```
EXTERNAL META APPROVAL REQUIRED — App Review:
- Advanced Access para whatsapp_business_messaging
- Advanced Access para whatsapp_business_management
- Advanced Access para business_management
- Tech Provider / Solution Partner (opcional, para operação em escala)

EXTERNAL META APPROVAL REQUIRED — Business Verification:
- Walletz Corp deve completar Business Verification no Meta Business Manager
- Cada cliente (tenant) precisa que seu WABA seja aprovada pela Meta

EXTERNAL META APPROVAL REQUIRED — Configuration:
- Criar Meta App em developers.facebook.com
- Adicionar produto WhatsApp Business
- Criar Embedded Signup Configuration ID
- Configurar allowed domains e redirect URIs
- Configurar webhook (requer URL HTTPS pública)
```
