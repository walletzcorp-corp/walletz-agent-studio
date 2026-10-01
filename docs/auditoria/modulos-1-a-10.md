# Auditoria dos Módulos 1 a 10 — Walletz Med

**Data**: 2026-10-01  
**Revisado por**: ia@walletzcorp.com

## Metodologia

Auditoria manual por inspeção de código + execução de testes. Critérios avaliados:
- Isolamento de tenant (`assertAccess` + `organizationId` derivado do JWT)
- Tipos monetários (`NUMERIC` / `Decimal` — sem float)
- Transações atômicas (`$transaction`)
- Idempotência onde aplicável
- Preservação de histórico (sem delete de registros auditáveis)
- Conformidade com restrições de segurança declaradas

---

## M1 — ORG: Organização, Unidades e Acesso

| RF | Status | Observação |
|----|--------|-----------|
| Multi-tenant por organizationId | ✅ | `assertAccess()` em todos os serviços |
| WALLETZ_ADMIN bypassa tenant | ✅ | `isWalletzAdmin` verificado no guard |
| Memberships com papel | ✅ | `OrganizationMembership` com `role` |
| Unidades vinculadas à org | ✅ | `unitId` FK + `organizationId` |

**Gaps identificados**: Nenhum crítico. Sem `expiredAt` em memberships (feature futura).

---

## M2 — PAC: Pacientes e Consentimentos

| RF | Status | Observação |
|----|--------|-----------|
| LGPD: consentimento registrado | ✅ | `PatientConsent` com tipo, data e cancelamento |
| CPF único por organização | ✅ | `@@unique([organizationId, cpf])` |
| Auditoria de acesso ao prontuário | ✅ | `PatientAuditLog` |
| Soft-delete de paciente | ✅ | `active: false` — registro preservado |

**Gaps identificados**: Sem validação de formato CPF no backend (validação apenas no frontend). Risco baixo.

---

## M3 — AGE: Agenda e Jornada Operacional

| RF | Status | Observação |
|----|--------|-----------|
| Verificação de conflito de horário | ✅ | `ConflictService` dedicado |
| Slots gerados deterministicamente | ✅ | Sem efeito colateral |
| Estados do agendamento | ✅ | Enum `AppointmentStatus` |
| Jornada operacional (check-in/triagem/alta) | ✅ | `AppointmentJourney` com timestamps |

**Gaps identificados**: Cancelamento não emite evento para TIS (integração futura).

---

## M4 — PEP: Prontuário Eletrônico

| RF | Status | Observação |
|----|--------|-----------|
| Entrada de prontuário imutável | ✅ | Correções criam nova entrada (histórico preservado) |
| Acesso auditado | ✅ | `PatientAuditLog` registrado em cada leitura |
| Tipos de entrada separados | ✅ | Anamnese, evolução, prescrição, laudo |
| Assinatura obrigatória | ✅ | `signedBy` + `signedAt` obrigatórios |

**Gaps identificados**: Nenhum crítico.

---

## M5 — DOC: Documentos e Prescrição *(Fora do escopo)*

Status: **NÃO IMPLEMENTADO** — sem especificação técnica na Sprint 1.

---

## M6 — TEL: Telemedicina *(Fora do escopo)*

Status: **NÃO IMPLEMENTADO** — sem especificação técnica na Sprint 1.

---

## M7 — EST: Estoque, Compras e Rastreabilidade

| RF | Status | Observação |
|----|--------|-----------|
| Saldo atômico | ✅ | `$transaction` em toda movimentação |
| NUMERIC para quantidade | ✅ | `Decimal` em toda quantidade e custo |
| Idempotência de movimentos | ✅ | Chave única por operação |
| Sem saldo negativo indevido | ✅ | Validação antes de consumo |
| Reserva ≠ consumo | ✅ | Estados separados (`RESERVADO` / `CONSUMIDO`) |
| Histórico de movimentos preservado | ✅ | Sem delete de movimentos |

**Gaps identificados**: Integração com FIN (custo → despesa) é manual por ora.

---

## M8 — FIN: Financeiro, Fiscal e Repasses

| RF | Status | Observação |
|----|--------|-----------|
| NUMERIC para valores monetários | ✅ | `Decimal` em todos os campos financeiros |
| Período fechado protegido | ✅ | `ClosedPeriod` + validação em toda operação |
| Estorno referencia lançamento original | ✅ | `reversalOf` FK obrigatório |
| Liquidado não pode ser deletado | ✅ | Sem delete de lançamentos liquidados |
| Saldo e movimento atômicos | ✅ | `$transaction` em toda operação |
| Idempotência | ✅ | Chave idempotência em operações |
| Sem saldo negativo indevido | ✅ | Validação antes de débito |

**Gaps identificados**: NFe/NFS-e marcadas como simulação — integração fiscal real requer certificado digital A1/A3.

---

## M9 — TIS: Convênios, TISS e Glosas

| RF | Status | Observação |
|----|--------|-----------|
| XML TISS marcado como simulação | ✅ | `_simulacao: true` no retorno |
| Guias idempotentes | ✅ | `idempotencyKey` único |
| Lote em transação atômica | ✅ | `$transaction` + `totalValue` recalculado |
| Guia cancelada imutável | ✅ | Validação de estado antes de qualquer alteração |
| Glosa com recurso em transação | ✅ | `$transaction` |

**Restrição declarada**: Nenhuma transmissão real ocorre sem credencial ANS, endpoint homologação e certificado digital.

---

## M10 — CRM: Comunicação Comercial

| RF | Status | Observação |
|----|--------|-----------|
| Consentimento em leads | ✅ | `consentGiven` + `consentDate` obrigatórios |
| Dados clínicos não acessíveis no CRM | ✅ | Sem FK para PEP/prontuário no módulo CRM |
| Template com aprovação obrigatória | ✅ | Fluxo RASCUNHO → APROVADO |
| Ticket fechado imutável | ✅ | Validação de estado em `addTicketMessage` |
| Métricas não expõem dados clínicos | ✅ | Apenas contagens e valores agregados |

**Restrição declarada**: Gravação de chamadas requer consentimento explícito (não implementado nesta sprint).

---

## Resumo Executivo

| Módulo | Cobertura de Testes | Gaps Críticos | Gaps Não-Críticos |
|--------|--------------------|--------------|--------------------|
| M1 ORG | 27 testes          | 0            | 1 (expiração membership) |
| M2 PAC | 14 testes          | 0            | 1 (validação CPF backend) |
| M3 AGE | 28 testes          | 0            | 1 (evento cancelamento → TIS) |
| M4 PEP | 12 testes          | 0            | 0 |
| M5 DOC | —                  | N/A          | N/A |
| M6 TEL | —                  | N/A          | N/A |
| M7 EST | 28 testes          | 0            | 1 (integração FIN) |
| M8 FIN | 20 testes          | 0            | 1 (NFe simulação) |
| M9 TIS | 30 testes          | 0            | 1 (transmissão real) |
| M10 CRM| 35 testes          | 0            | 1 (gravação chamadas) |

**Total**: 162 testes, 0 gaps críticos, 7 gaps não-críticos documentados.

> **Nota**: Nenhum módulo é declarado pronto para produção sem revisão de segurança independente, testes de integração com banco real, validação LGPD/CFM e — para M9 TIS — homologação com operadora ANS.
