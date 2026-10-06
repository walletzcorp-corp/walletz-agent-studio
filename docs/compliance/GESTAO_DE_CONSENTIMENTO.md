# Gestão de Consentimento — Walletz Agent Studio

> LGPD Art. 7º, I — Art. 15 — Art. 18
> Atualizado: 2026-10-06

## Modelo de Consentimento

### Tabela `consents`
```sql
id          text PRIMARY KEY
contact_id  text → contacts.id
tenant_id   text → tenants.id
channel     text  -- 'whatsapp', 'email', 'sms'
purpose     text  -- 'marketing', 'transactional', 'support'
status      enum  -- 'pending', 'granted', 'revoked', 'expired'
source      text  -- 'import', 'whatsapp_inbound', 'form_web', etc.
collected_at timestamp
expires_at  timestamp (nullable — consentimento sem prazo)
revoked_at  timestamp (nullable)
evidence_data jsonb -- prova do consentimento (metadados)
```

## Ciclo de Vida do Consentimento

```
PENDING → (ação do usuário) → GRANTED
GRANTED → (revogação) → REVOKED
GRANTED → (expiração) → EXPIRED (verificado em runtime)
REVOKED → não pode ser reativado automaticamente
```

## Como o Consentimento é Coletado

| Origem | `source` | Forma de coleta | Evidência |
|--------|----------|----------------|-----------|
| Importação de planilha | `import` | Campo "tem consentimento WhatsApp" | data e campo de origem |
| Inbound WhatsApp | `whatsapp_inbound` | Primeira mensagem → consentimento implícito* | timestamp |
| Formulário web do tenant | `form_web` | Checkbox + submissão | form_id, timestamp, IP |
| API externa | `api` | Integração do tenant | userId, timestamp |

*Consentimento implícito em inbound: o usuário iniciou a conversa. Deve ser registrado pelo tenant com base legal adequada.

## Como o Opt-out é Processado

1. Usuário envia "STOP" (ou similar) via WhatsApp
2. `handleOptOut()` em `whatsapp.service.ts` é chamado automaticamente
3. Número adicionado à tabela `suppressions` (idempotente)
4. Todos os consentimentos WhatsApp do contato → status `revoked`
5. Mensagem de confirmação enviada ao usuário
6. Audit log registrado (`whatsapp.opt_out`)
7. Contato não receberá mais campanhas (verificado em `campaigns.service.ts`)

### Palavras-chave que Ativam Opt-out (case-insensitive):
```
stop, sair, cancelar, pare, parar, remover, descadastrar,
desinscrever, não quero, nao quero, opt out, optout,
unsubscribe, cancel
```

## Validação na Campanha

Antes de enviar qualquer campanha, `checkSingleRecipient()` verifica:
1. Número válido (E.164)
2. Consentimento `status = granted` E `expires_at IS NULL OR expires_at >= now()`
3. Não está em `suppressions`
4. Não ultrapassou frequência (1 campanha/24h)
5. Contato não está bloqueado

## API de Consentimento

```
GET  /tenants/:id/privacy/consents               — lista todos os consentimentos
POST /tenants/:id/privacy/contacts/:cid/revoke-consent — revoga consentimento específico
```

## Responsabilidades

| Parte | Responsabilidade |
|-------|----------------|
| **Tenant (controlador)** | Coletar consentimento antes de importar contatos para campanhas de marketing |
| **Tenant** | Informar titulares sobre finalidade, canal e prazo |
| **Walletz (operadora)** | Armazenar, verificar e respeitar os consentimentos registrados |
| **Walletz** | Processar opt-out automático via STOP |
| **Walletz** | Não enviar mensagens de marketing sem consentimento verificado |
