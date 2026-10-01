# Módulo 14 — MED: Segurança de Medicamentos

**Código**: MED  
**Versão**: 1.0.0  
**Data**: 2026-10-01

## Visão Geral

Gestão completa do ciclo de vida dos medicamentos: desde a prescrição até a administração, com rastreabilidade de lotes, dupla checagem configurável, controle de reações adversas e auditoria completa de toda correção pós-administração.

## Requisitos Implementados

| RF | Descrição | Status |
|----|-----------|--------|
| RF-MED-001 | Listagem de protocolos por organização com filtros | ✅ |
| RF-MED-002 | Criação de protocolo de medicamento por responsável clínico | ✅ |
| RF-MED-003 | Atualização de protocolo com versionamento | ✅ |
| RF-MED-004 | Criação de registro de administração com verificação de lote e validade | ✅ |
| RF-MED-005 | Listagem de registros com filtros por paciente, status, período | ✅ |
| RF-MED-006 | Registro de administração confirmada (dupla identificação de paciente) | ✅ |
| RF-MED-007 | Adição de verificação para dupla checagem | ✅ |
| RF-MED-008 | Devolução/descarte de medicamento reservado | ✅ |
| RF-MED-009 | Correção de registro pós-administração (preserva original, gera auditoria) | ✅ |
| RF-MED-010 | Criação de alerta de lote (bloqueio, vencimento, recolhimento) | ✅ |
| RF-MED-011 | Listagem de alertas de lote ativos | ✅ |
| RF-MED-012 | Resolução de alerta de lote | ✅ |
| RF-MED-013 | Registro de reação adversa | ✅ |
| RF-MED-014 | Listagem de reações adversas | ✅ |
| RF-MED-015 | Dashboard de segurança de medicamentos | ✅ |
| RF-MED-016 | Histórico de auditoria de registro | ✅ |
| RF-MED-017 | Bloqueio de lote por alerta ativo na criação de registro | ✅ |
| RF-MED-018 | Bloqueio de mesmo usuário em dupla checagem | ✅ |

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/v1/med/protocols` | Listar protocolos |
| POST | `/v1/med/protocols` | Criar protocolo |
| PATCH | `/v1/med/protocols/:id` | Atualizar protocolo |
| GET | `/v1/med/records` | Listar registros |
| POST | `/v1/med/records` | Criar registro |
| POST | `/v1/med/records/:id/administer` | Confirmar administração |
| POST | `/v1/med/records/:id/verify` | Adicionar verificação |
| POST | `/v1/med/records/:id/return` | Devolver/descartar |
| PATCH | `/v1/med/records/:id/correct` | Corrigir registro |
| GET | `/v1/med/records/:id/audit` | Histórico de auditoria |
| POST | `/v1/med/lot-alerts` | Criar alerta de lote |
| GET | `/v1/med/lot-alerts` | Listar alertas ativos |
| PATCH | `/v1/med/lot-alerts/:id/resolve` | Resolver alerta |
| POST | `/v1/med/adverse-reactions` | Registrar reação adversa |
| GET | `/v1/med/dashboard` | Dashboard de segurança |

## Regras de Segurança

1. **Dupla identificação de paciente**: `patient1stId` e `patient2ndId` devem ser informados e distintos de número de leito
2. **Dupla checagem**: quando `requiresDualCheck = true` no protocolo, os dois verificadores devem ser usuários distintos
3. **Bloqueio de lote**: lotes com alerta ativo (`active = true`) bloqueiam novos registros com mensagem clara
4. **Validade**: lote vencido é rejeitado na criação do registro
5. **Imutabilidade pós-administração**: registros `ADMINISTRADO` só podem ser corrigidos via endpoint de correção, que preserva o original e cria `MedRecordAudit`
6. **Transicionalidade de estados**: RESERVADO → PREPARADO → ADMINISTRADO / DEVOLVIDO / DESCARTADO / BAIXADO
7. **Sem prescrição autônoma**: o módulo executa protocolos aprovados por responsável clínico; não gera prescrições

## Modelos de Dados

- `MedProtocol` — protocolo aprovado por responsável clínico
- `MedAdministrationRecord` — registro de cada administração com dupla identificação
- `MedVerification` — registro de cada verificador (dupla checagem)
- `MedAdverseReaction` — reações adversas vinculadas ao registro
- `MedLotAlert` — alertas de lote com bloqueio automático
- `MedRecordAudit` — trilha imutável de correções

## Arquivos

| Arquivo | Caminho |
|---------|---------|
| Serviço | `apps/api/src/modules/med/services/med.service.ts` |
| Controller | `apps/api/src/modules/med/med.controller.ts` |
| Módulo | `apps/api/src/modules/med/med.module.ts` |
| Testes | `apps/api/src/modules/med/services/med.service.spec.ts` |
| Frontend | `apps/web/src/app/(admin)/medicamentos/page.tsx` |
