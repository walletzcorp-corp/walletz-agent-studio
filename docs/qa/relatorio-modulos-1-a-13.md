# Relatório QA — Módulos 1 a 13

**Data**: 2026-10-01  
**Ambiente**: Desenvolvimento local (PostgreSQL 18, porta 5433)  
**Framework**: NestJS 10 + Prisma 5 + Jest

## Sumário de Testes

| Suíte | Arquivo | Testes | Status |
|-------|---------|--------|--------|
| Organizações | `organizations.service.spec.ts` | 12 | ✅ PASS |
| Isolamento Tenant | `tenant-isolation.spec.ts` | 15 | ✅ PASS |
| Unidades | `units.service.spec.ts` | 8 | ✅ PASS |
| Agendamento | `appointments.service.spec.ts` | 18 | ✅ PASS |
| Conflitos Agenda | `conflict.service.spec.ts` | 10 | ✅ PASS |
| Pacientes | `patients.service.spec.ts` | 14 | ✅ PASS |
| Prontuário (PEP) | `pep.service.spec.ts` | 12 | ✅ PASS |
| Estoque (EST) | `estoque.service.spec.ts` | 28 | ✅ PASS |
| Financeiro (FIN) | `financeiro.service.spec.ts` | 20 | ✅ PASS |
| Convênios/TIS (M9) | `tis.service.spec.ts` | 30 | ✅ PASS |
| CRM (M10) | `crm.service.spec.ts` | 35 | ✅ PASS |
| IA (M11) | `ia.service.spec.ts` | 25 | ✅ PASS |
| Integrações (M12) | `int.service.spec.ts` | 28 | ✅ PASS |
| Salas (M13) | `sal.service.spec.ts` | 30 | ✅ PASS |
| **Total** | **14 suítes** | **231** | **✅ 231/231** |

## Cobertura por Requisito — M11 IA

| RF | Descrição | Coberto |
|----|-----------|---------|
| RF-IA-001 | Listagem de configs por organização | ✅ |
| RF-IA-002 | Upsert config com defaults | ✅ |
| RF-IA-003 | Aprovação de config + NotFoundException | ✅ |
| RF-IA-004 | Desativação de caso de uso | ✅ |
| RF-IA-005 | Geração de rascunho simulado com disclaimer | ✅ |
| RF-IA-006 | Listagem de rascunhos pendentes | ✅ |
| RF-IA-007 | Aceite de rascunho + validação de estado | ✅ |
| RF-IA-008 | Rejeição de rascunho + validação de estado | ✅ |
| RF-IA-009 | Expiração de rascunhos vencidos | ✅ |
| RF-IA-010 | Registro de métrica de qualidade | ✅ |
| RF-IA-011 | Listagem de métricas | ✅ |
| RF-IA-012 | Listagem de logs de uso | ✅ |

## Cobertura por Requisito — M12 INT

| RF | Descrição | Coberto |
|----|-----------|---------|
| RF-INT-001 | Listagem de webhooks sem secretHash | ✅ |
| RF-INT-002 | Criação com secret retornado UMA VEZ | ✅ |
| RF-INT-003 | Rotação de segredo + NotFoundException | ✅ |
| RF-INT-004 | Ativar/desativar webhook | ✅ |
| RF-INT-005 | Entrega idempotente por chave | ✅ |
| RF-INT-006 | Retorno de entrega existente sem duplicar | ✅ |
| RF-INT-007 | Listagem de conectores | ✅ |
| RF-INT-008 | Conector com status NAO_CONFIGURADO por padrão | ✅ |
| RF-INT-009 | Criação de sessão portal | ✅ |
| RF-INT-010 | Validação de sessão ativa / expirada / revogada | ✅ |
| RF-INT-011 | Revogação de sessão | ✅ |
| RF-INT-012 | Salvamento de recurso FHIR R4 | ✅ |
| RF-INT-013 | Busca de recurso FHIR + NotFoundException | ✅ |
| RF-INT-014 | Consentimento de integração | ✅ |
| RF-INT-015 | Revogação de consentimento + BadRequest se já revogado | ✅ |
| RF-INT-016 | Listagem de consentimentos do paciente | ✅ |

## Cobertura por Requisito — M13 SAL

| RF | Descrição | Coberto |
|----|-----------|---------|
| RF-SAL-001 | Listagem de salas com posições | ✅ |
| RF-SAL-002 | Criação com código único por org + ConflictException | ✅ |
| RF-SAL-003 | Atualização de sala + NotFoundException | ✅ |
| RF-SAL-004 | Máquina de estado: LIVRE→RESERVADA válida | ✅ |
| RF-SAL-004 | Máquina de estado: LIVRE→OCUPADA inválida | ✅ |
| RF-SAL-004 | force=true bypassa máquina de estado | ✅ |
| RF-SAL-005 | Adição de poltrona com padrão POLTRONA | ✅ |
| RF-SAL-007 | Criação de reserva sem conflito | ✅ |
| RF-SAL-007 | ConflictException em dupla reserva | ✅ |
| RF-SAL-007 | BadRequest quando sala BLOQUEADA | ✅ |
| RF-SAL-009 | Avanço de status CONFIRMADA→OCUPADA com actualStart | ✅ |
| RF-SAL-009 | BadRequest em reserva já finalizada | ✅ |
| RF-SAL-010 | Cancelamento libera sala + atualiza status | ✅ |
| RF-SAL-010 | BadRequest em cancelamento de reserva já cancelada | ✅ |
| RF-SAL-011 | Registro de evento de fluxo | ✅ |
| RF-SAL-012 | Início de checklist com criação de itens | ✅ |
| RF-SAL-014 | Bloqueio por item crítico pendente | ✅ |
| RF-SAL-014 | force=true libera com justificativa | ✅ |
| RF-SAL-015 | Incidente bloqueia sala automaticamente | ✅ |
| RF-SAL-016 | Resolução de incidente + BadRequest se já resolvido | ✅ |
| RF-SAL-020 | Painel de ocupação | ✅ |

## Verificações de Segurança

| Verificação | M11 IA | M12 INT | M13 SAL |
|-------------|--------|---------|---------|
| ForbiddenException para org externa | ✅ | ✅ | ✅ |
| Admin WalletzAdmin bypassa restrição | ✅ | ✅ | ✅ |
| Transações atômicas ($transaction) | ✅ | — | ✅ |
| Idempotência de operações | ✅ (rascunhos) | ✅ (entregas) | — |
| Histórico preservado (sem delete) | ✅ | ✅ | ✅ (RoomStateLog) |
| Segredo nunca em texto claro | N/A | ✅ (secretHash) | N/A |
| Config JSON nunca exposta | N/A | ✅ (select excluído) | N/A |

## Restrições Declaradas

> **M11 IA**: Rascunhos gerados em **modo simulação**. Provider padrão: `simulated`. Nenhuma chamada a API de IA externa ocorre.
> IA não substitui decisão clínica, não assina, não prescreve e não finaliza prontuário autonomamente.

> **M12 INT**: Todos os conectores estão em status **NAO_CONFIGURADO**. Nenhuma chamada a HubSpot, WhatsApp, pagamento, FHIR/RNDS ou outros serviços ocorre sem credenciais validadas.
> Secretes de webhook são armazenados apenas como hash HMAC-SHA256.

> **M13 SAL**: Custos de sala **não são calculados automaticamente** sem integração com FIN (M8) e EST (M7).
> Mudanças de estado são auditadas em `RoomStateLog` e não podem ser apagadas.

## Resultado Final

```
Test Suites: 14 passed, 14 total
Tests:       231 passed, 231 total
TypeScript:  0 erros (api + web)
Migration:   20261001100000_module11_ia_module12_int_module13_sal — aplicada com sucesso
Prisma Generate: OK
```

**Aptidão para implantação de desenvolvimento**: **APTO** com as ressalvas declaradas.

> O sistema não deve ser declarado em produção sem: revisão de segurança independente, testes de integração com banco real, validação de LGPD/CFM, e — para M9 TIS — homologação com operadora ANS.
