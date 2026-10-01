# Módulo 17 — EQP: Equipe, Escalas e Credenciais

**Código**: EQP  
**Versão**: 1.0.0  
**Data**: 2026-10-01

## Visão Geral

Gestão de credenciais e registros profissionais (CRM, COREN, CRF etc.), competências e habilitações, escalas de trabalho e turnos com controle de conflito de horário. Todas as alterações de credencial, privilégio e escala geram auditoria automática.

## Requisitos Implementados

| RF | Descrição | Status |
|----|-----------|--------|
| RF-EQP-001 | Registro de credencial profissional por organização | ✅ |
| RF-EQP-002 | Listagem de credenciais com filtros (tipo, status, profissional) | ✅ |
| RF-EQP-003 | Atualização de status de credencial com auditoria | ✅ |
| RF-EQP-004 | Listagem de credenciais a vencer em N dias | ✅ |
| RF-EQP-005 | Registro de competência/habilitação | ✅ |
| RF-EQP-006 | Listagem de competências por profissional | ✅ |
| RF-EQP-007 | Criação de escala de trabalho | ✅ |
| RF-EQP-008 | Listagem de escalas com contagem de turnos | ✅ |
| RF-EQP-009 | Criação de turno com detecção de conflito de horário | ✅ |
| RF-EQP-010 | Atualização de status de turno com trilha de auditoria | ✅ |
| RF-EQP-011 | Substituição de turno com verificação de conflito do substituto | ✅ |
| RF-EQP-012 | Listagem de turnos com filtros | ✅ |
| RF-EQP-013 | Dashboard de equipe | ✅ |

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/v1/eqp/credentials` | Listar credenciais |
| POST | `/v1/eqp/credentials` | Registrar credencial |
| PATCH | `/v1/eqp/credentials/:id/status` | Atualizar status |
| GET | `/v1/eqp/credentials/expiring` | Credenciais a vencer |
| GET | `/v1/eqp/competencies` | Listar competências |
| POST | `/v1/eqp/competencies` | Registrar competência |
| GET | `/v1/eqp/schedules` | Listar escalas |
| POST | `/v1/eqp/schedules` | Criar escala |
| GET | `/v1/eqp/shifts` | Listar turnos |
| POST | `/v1/eqp/shifts` | Criar turno |
| PATCH | `/v1/eqp/shifts/:id/status` | Atualizar status do turno |
| GET | `/v1/eqp/dashboard` | Dashboard |

## Regras de Segurança

1. **Conflito de turno**: dois turnos sobrepostos para o mesmo profissional lançam `ConflictException`
2. **Conflito do substituto**: ao SUBSTITUIR um turno, o sistema verifica se o substituto tem conflito no mesmo horário
3. **Estados finais imutáveis**: turnos CONCLUIDO ou CANCELADO não podem ter o status alterado
4. **Auditoria de turno**: toda mudança de status cria `WorkShiftAudit` em transação atômica
5. **Credencial não implica habilitação**: o sistema não infere habilitação clínica pelo `credentialType`; a habilitação deve ser verificada separadamente
6. **Alterações de credencial auditadas**: `updateCredentialStatus` registra `verifiedBy` (userId do atualizador) e `verifiedAt`
7. **Vínculos com vigência**: credenciais têm `issuedAt` e `expiresAt`; alerta de vencimento configurável por `daysAhead`

## Fluxo de Turno

```
AGENDADO → EM_ANDAMENTO → CONCLUIDO
         → CANCELADO
         → FALTA
         → SUBSTITUIDO (verifica conflito do substituto antes)
```

## Nota sobre Nomenclatura

O modelo de credenciais deste módulo é `EqpCredential` (tabela `eqp_credentials`), distinto do modelo pré-existente `ProfessionalCredential` (tabela `professional_credentials`) do módulo ORG, que armazena apenas número de conselho sem gestão de status ou verificação.

## Modelos de Dados

- `EqpCredential` — credencial com status, órgão emissor, vigência e verificação
- `TeamCompetency` — competência/habilitação com nível e validade
- `WorkSchedule` — escala de trabalho com período de vigência
- `WorkShift` — turno individual com horário, status e substituto opcional
- `WorkShiftAudit` — trilha imutável de todas as alterações de turno

## Arquivos

| Arquivo | Caminho |
|---------|---------|
| Serviço | `apps/api/src/modules/eqp/services/eqp.service.ts` |
| Controller | `apps/api/src/modules/eqp/eqp.controller.ts` |
| Módulo | `apps/api/src/modules/eqp/eqp.module.ts` |
| Testes | `apps/api/src/modules/eqp/services/eqp.service.spec.ts` |
| Frontend | `apps/web/src/app/(admin)/equipe/page.tsx` |
