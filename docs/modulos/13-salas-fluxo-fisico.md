# Módulo 13 — SAL: Salas, Poltronas, Equipamentos e Fluxo Físico

## Escopo

RF-SAL-001 a RF-SAL-020 — Gestão de salas, reservas, checklists, fluxo de pacientes e incidentes.

## Princípios Obrigatórios

> **Mudança de estado deve seguir transições válidas, com responsável, horário, motivo e auditoria.**
> Não permita dupla reserva de sala, poltrona, equipamento ou equipe.
> Bloqueio por manutenção, incidente ou contaminação deve impedir nova alocação.
> Pendências críticas impedem liberação; exceções exigem permissão e justificativa auditável.
> Custos e margens precisam ser rastreáveis às fontes de FIN e EST; não invente valores quando não houver integração.

## Componentes Implementados

| Arquivo | Descrição |
|---------|-----------|
| `apps/api/src/modules/sal/services/sal.service.ts` | Serviço com 20 operações |
| `apps/api/src/modules/sal/sal.controller.ts` | Controller REST versão 1 |
| `apps/api/src/modules/sal/sal.module.ts` | Módulo NestJS |
| `apps/api/src/modules/sal/services/sal.service.spec.ts` | 30 testes unitários |
| `apps/web/src/app/(admin)/salas/page.tsx` | Painel de ocupação e estados |

## Schema (Prisma)

- `Room` — Sala com tipo, capacidade, status e restrições
- `RoomPosition` — Poltrona/posição dentro da sala
- `RoomStateLog` — Histórico de cada transição de estado (responsável, motivo, timestamp)
- `RoomChecklistTemplate` + `RoomChecklistTemplateItem` — Templates de checklist por tipo de sala
- `RoomChecklistExecution` + `RoomChecklistExecutionItem` — Execução com itens e criticidade
- `RoomBooking` — Reserva com período, limpeza, preparação e status
- `RoomPatientFlowEvent` — Eventos de fluxo (entrada, triagem, alta)
- `RoomIncident` — Incidentes com gravidade, status e resolução

## Endpoints REST (prefixo `/api/v1/sal/:organizationId`)

| Método | Rota | RF | Descrição |
|--------|------|----|-----------|
| GET | `/salas` | RF-SAL-001 | Listar salas com posições |
| POST | `/salas` | RF-SAL-002 | Criar sala |
| PATCH | `/salas/:id` | RF-SAL-003 | Atualizar sala |
| PATCH | `/salas/:id/status` | RF-SAL-004 | Mudar estado (máquina de estado) |
| GET | `/salas/:id/historico` | RF-SAL-019 | Histórico de estados |
| POST | `/salas/:id/posicoes` | RF-SAL-005 | Adicionar posição/poltrona |
| PATCH | `/posicoes/:id/status` | RF-SAL-006 | Mudar status de posição |
| GET | `/reservas` | RF-SAL-008 | Listar reservas por período |
| POST | `/reservas` | RF-SAL-007 | Criar reserva (sem dupla-reserva) |
| PATCH | `/reservas/:id/status` | RF-SAL-009 | Avançar estado da reserva |
| POST | `/reservas/:id/cancelar` | RF-SAL-010 | Cancelar reserva |
| POST | `/reservas/:id/eventos` | RF-SAL-011 | Registrar evento de fluxo |
| POST | `/checklists/templates` | RF-SAL-017 | Criar template de checklist |
| GET | `/checklists/templates` | RF-SAL-018 | Listar templates |
| POST | `/checklists/execucoes` | RF-SAL-012 | Iniciar execução de checklist |
| PATCH | `/checklists/execucoes/:eid/itens/:iid/concluir` | RF-SAL-013 | Concluir item |
| PATCH | `/checklists/execucoes/:id/concluir` | RF-SAL-014 | Concluir checklist (valida críticos) |
| POST | `/incidentes` | RF-SAL-015 | Registrar incidente (opção de bloquear) |
| PATCH | `/incidentes/:id/resolver` | RF-SAL-016 | Resolver incidente |
| GET | `/painel-ocupacao` | RF-SAL-020 | Painel de ocupação atual |

## Máquina de Estado das Salas

```
LIVRE → RESERVADA, BLOQUEADA, INATIVA
RESERVADA → PREPARADA, LIVRE
PREPARADA → OCUPADA, LIVRE
OCUPADA → HIGIENIZACAO
HIGIENIZACAO → LIVRE, BLOQUEADA
BLOQUEADA → LIVRE, INATIVA
INATIVA → LIVRE
```

Toda transição é registrada em `RoomStateLog` com `changedBy`, `reason` e timestamp.
Transições inválidas lançam `BadRequestException`. O parâmetro `force: true` é disponível apenas para casos de exceção (auditável).

## Prevenção de Dupla Reserva

Ao criar uma reserva, verificamos:
1. Conflito de horário na **sala** (considerando `setupMinutes` antes e `cleaningMinutes` depois)
2. Conflito de horário na **posição** (se informada)

Reservas com status `CANCELADA` ou `CONCLUIDA` não participam do conflito.
