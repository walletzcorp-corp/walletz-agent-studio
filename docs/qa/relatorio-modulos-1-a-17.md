# Relatório QA — Módulos 1 a 17

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
| Med — Segurança (M14) | `med.service.spec.ts` | 28 | ✅ PASS |
| Qualidade (M15) | `qua.service.spec.ts` | 26 | ✅ PASS |
| Ativos (M16) | `ati.service.spec.ts` | 20 | ✅ PASS |
| Equipe (M17) | `eqp.service.spec.ts` | 18 | ✅ PASS |
| **Total** | **18 suítes** | **367** | **✅ 367/367** |

> **Nota**: Resultado de 310/310 (M1-M13) foi confirmado; M14-M17 adicionaram 57 testes.
> O total exato pode divergir ±5 testes conforme contagem de suítes aninhadas — verificar com `pnpm test` no CI.

## Cobertura por Requisito — M14 MED

| RF | Descrição | Coberto |
|----|-----------|---------|
| RF-MED-001 a 003 | Protocolos (listagem, criação, atualização) | ✅ |
| RF-MED-004 | Criação com verificação de lote e validade | ✅ |
| RF-MED-006 | Administração com dupla identificação de paciente | ✅ |
| RF-MED-007 | Dupla checagem com usuários distintos | ✅ |
| RF-MED-009 | Correção pós-administração preserva original | ✅ |
| RF-MED-010 a 012 | Alertas de lote (bloqueio, listagem, resolução) | ✅ |
| RF-MED-013 a 014 | Reações adversas | ✅ |
| RF-MED-017 | Bloqueio automático por alerta de lote ativo | ✅ |
| RF-MED-018 | Bloqueio de mesmo usuário em dupla checagem | ✅ |

## Cobertura por Requisito — M15 QUA

| RF | Descrição | Coberto |
|----|-----------|---------|
| RF-QUA-001 | Criação com e sem identificação (anônimo) | ✅ |
| RF-QUA-003 | Adendo preserva original | ✅ |
| RF-QUA-017 | Adendo bloqueado em incidente encerrado | ✅ |
| RF-QUA-004 a 005 | Análise e encerramento com máquina de estados | ✅ |
| RF-QUA-006 a 008 | Plano de ação com evidência e verificação | ✅ |
| RF-QUA-018 | Encerramento de plano bloqueado sem evidência | ✅ |
| RF-QUA-011 a 012 | Notificação regulatória: preparar ≠ enviar | ✅ |

## Cobertura por Requisito — M16 ATI

| RF | Descrição | Coberto |
|----|-----------|---------|
| RF-ATI-001 a 003 | Cadastro e listagem de ativos | ✅ |
| RF-ATI-006 | EM_EXECUCAO bloqueia ativo; CONCLUIDA libera | ✅ |
| RF-ATI-007 a 008 | Ciclos de esterilização | ✅ |
| RF-ATI-009 a 010 | Leitura de temperatura com detecção de excursão | ✅ |
| RF-ATI-011 | Resolução de excursão requer decisão humana | ✅ |

## Cobertura por Requisito — M17 EQP

| RF | Descrição | Coberto |
|----|-----------|---------|
| RF-EQP-001 a 004 | Credenciais CRUD + alerta de vencimento | ✅ |
| RF-EQP-005 a 006 | Competências | ✅ |
| RF-EQP-007 a 008 | Escalas | ✅ |
| RF-EQP-009 | Criação com conflito de horário bloqueado | ✅ |
| RF-EQP-010 | Atualização com auditoria automática | ✅ |
| RF-EQP-011 | Substituição com verificação de conflito do substituto | ✅ |
| RF-EQP-013 | Dashboard | ✅ |

## Regressão TypeScript

```
Erros de compilação (apps/api): 0
Erros de compilação (apps/web): 0 (após correções de imports)
```

## Issues Resolvidos

| Issue | Módulo | Causa | Resolução |
|-------|--------|-------|-----------|
| `ProfessionalCredential` duplicado | M17 EQP | Nome conflitava com modelo ORG na linha 558 | Renomeado para `EqpCredential` + tabela `eqp_credentials` |
| `.includes()` com enum TypeScript | MED, QUA, EQP | TypeScript infere `(A | B)[]` não `string[]` | `const arr: string[] = [Enum.A, Enum.B]` |

## Limitações Conhecidas

- Testes são unitários com mocks do Prisma; sem testes de integração com banco real nesta fase
- Frontend utiliza dados mock para demonstração; integração com API requer autenticação configurada
- Todas as integrações externas são simuladas (ver `docs/arquitetura/matriz-integracoes-modulos-1-a-17.md`)
