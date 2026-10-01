# Módulo 12 — INT: Integrações e Portal do Paciente

## Escopo

RF-INT-001 a RF-INT-016 — Webhooks, conectores externos, portal do paciente, FHIR e consentimentos.

## Princípios Obrigatórios

> **Webhooks devem ser assinados (HMAC-SHA256), idempotentes, repetíveis e observáveis; segredo deve poder ser rotacionado.**
> Um erro externo não pode perder ou duplicar transação interna.
> Integrações externas (HubSpot, RD Station, Salesforce, pagamento, e-mail, SMS, WhatsApp, FHIR, RNDS, DICOM/PACS) são adaptadores — status NAO_CONFIGURADO por padrão.
> Portal do paciente controla acesso, consentimento e expiração de sessão.

## Componentes Implementados

| Arquivo | Descrição |
|---------|-----------|
| `apps/api/src/modules/int/services/int.service.ts` | Serviço com webhooks, conectores, portal, FHIR |
| `apps/api/src/modules/int/int.controller.ts` | Controller REST versão 1 |
| `apps/api/src/modules/int/int.module.ts` | Módulo NestJS |
| `apps/api/src/modules/int/services/int.service.spec.ts` | 28 testes unitários |
| `apps/web/src/app/(admin)/integracoes/page.tsx` | Painel de conectores, webhooks e portal |

## Schema (Prisma)

- `WebhookEndpoint` — Endpoint registrado com `secretHash` (HMAC) — segredo nunca em claro
- `WebhookEventDelivery` — Entrega idempotente por `idempotencyKey` único
- `IntegrationConnector` — Conector por tipo (HUBSPOT, FHIR, etc.) com status NAO_CONFIGURADO padrão
- `PatientPortalSession` — Sessão com token único, expiração e revogação
- `FhirResource` — Recurso FHIR R4 versionado
- `IntegrationConsentGrant` — Consentimento por paciente/conector com revogação

## Endpoints REST (prefixo `/api/v1/int/:organizationId`)

| Método | Rota | RF | Descrição |
|--------|------|----|-----------|
| GET | `/webhooks` | RF-INT-001 | Lista webhooks (sem secretHash) |
| POST | `/webhooks` | RF-INT-002 | Criar webhook (retorna secret UMA VEZ) |
| POST | `/webhooks/:id/rotacionar-segredo` | RF-INT-003 | Rotacionar segredo HMAC |
| PATCH | `/webhooks/:id/status` | RF-INT-004 | Ativar/desativar webhook |
| POST | `/webhooks/:id/entregas` | RF-INT-005 | Registrar entrega (idempotente) |
| GET | `/webhooks/:id/entregas` | RF-INT-006 | Listar entregas |
| GET | `/conectores` | RF-INT-007 | Listar conectores (sem configJson) |
| POST | `/conectores` | RF-INT-008 | Upsert conector |
| POST | `/portal/sessoes` | RF-INT-009 | Criar sessão portal paciente |
| POST | `/portal/sessoes/validar` | RF-INT-010 | Validar token de sessão |
| POST | `/portal/sessoes/revogar` | RF-INT-011 | Revogar sessão |
| POST | `/fhir` | RF-INT-012 | Salvar recurso FHIR |
| GET | `/fhir/:type/:id` | RF-INT-013 | Buscar recurso FHIR mais recente |
| POST | `/consentimentos` | RF-INT-014 | Registrar consentimento de integração |
| PATCH | `/consentimentos/:id/revogar` | RF-INT-015 | Revogar consentimento |
| GET | `/pacientes/:id/consentimentos` | RF-INT-016 | Listar consentimentos do paciente |

## Segurança dos Webhooks

- Segredo gerado com `crypto.randomBytes(32)` → 64 chars hex
- Armazenado apenas como `HMAC-SHA256(secret)` — nunca em claro
- Retornado UMA VEZ na criação e na rotação; após isso, irrecuperável
- Idempotência via `idempotencyKey` único no banco (UNIQUE constraint)

## Conectores Externos

Todos os conectores são criados com `status = NAO_CONFIGURADO`. Nenhuma chamada externa é feita sem:
- Credenciais reais no `configJson`
- Status promovido a `ATIVO` explicitamente
- Teste em ambiente de homologação (não produção)
