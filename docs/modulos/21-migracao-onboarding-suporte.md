# M21 — Migração, Onboarding e Suporte (MIG)

**Status:** Implementado (MVP + F2)  
**Fase:** MVP (8 RFs), F2 (2 RFs)  
**Dependências:** M1 (ORG)

## Objetivo

Importação segura de dados legados com validação prévia, simulação sem alterar dados, aprovação explícita, execução com rollback disponível, aceite formal, health score de implantação, tickets de suporte e gestão de acessos temporários com mascaramento.

## Requisitos Funcionais

| ID | Descrição | Fase | Status |
|---|---|---|---|
| RF-MIG-001 | Criar job de migração (RASCUNHO) | MVP | ✅ |
| RF-MIG-002 | Validar job (totalRows, validRows, rejectedRows, duplicateRows, inputHash) | MVP | ✅ |
| RF-MIG-003 | Aprovar job (VALIDADO → APROVADO) com aprovador registrado | MVP | ✅ |
| RF-MIG-004 | Executar job (APROVADO → EXECUTANDO) com rollbackAvailable=true | MVP | ✅ |
| RF-MIG-005 | Rollback de job quando disponível | MVP | ✅ |
| RF-MIG-006 | Aceite formal após reconciliação (EXECUTANDO → CONCLUIDO) | MVP | ✅ |
| RF-MIG-007 | Listar jobs da organização | MVP | ✅ |
| RF-MIG-008 | Health score de implantação (média de 4 componentes) | MVP | ✅ |
| RF-MIG-009 | Tickets de suporte com ciclo de vida | F2 | ✅ |
| RF-MIG-010 | Acesso temporário com aprovação, escopo, mascaramento e auditoria | F2 | ✅ |

## Restrições de Segurança

- Toda importação começa com validação e simulação sem alterar dados
- Carga real exige aprovação explícita (approveJob) e aceite formal (formalAccept)
- Acesso temporário exige aprovação, prazo, escopo, mascaramento e auditoria
- Revogação de acesso appenda ao auditLog JSON (trilha imutável)
- Dados clínicos nunca sobrescritos sem regra explícita e trilha

## Ciclo de Vida do Job

```
RASCUNHO → VALIDADO → APROVADO → EXECUTANDO → CONCLUIDO
                                       ↓
                                   REVERTIDO
```

Transições inválidas bloqueadas com `BadRequestException`.

## Health Score

`overallScore = (implantationScore + adoptionScore + securityScore + operationScore) / 4`

Componentes:
- **Implantação** — progresso da migração e configuração
- **Adoção** — uso ativo dos módulos
- **Segurança** — conformidade e auditorias
- **Operação** — estabilidade e SLAs

## Modelos de Dados

- `MigJob` — job com hash de entrada, contadores e flag rollbackAvailable
- `MigHealthScore` — score composto com data e critérios (JSON)
- `MigTicket` — ticket de suporte com prioridade e ciclo de vida
- `MigAccessGrant` — acesso temporário com auditLog JSON e mascaramento
- `MigOnboardingConfig` — configuração de onboarding por organização

## Endpoints (v1)

```
POST   /v1/mig/:orgId/jobs
GET    /v1/mig/:orgId/jobs
POST   /v1/mig/:orgId/jobs/:id/validate
POST   /v1/mig/:orgId/jobs/:id/approve
POST   /v1/mig/:orgId/jobs/:id/execute
POST   /v1/mig/:orgId/jobs/:id/rollback
POST   /v1/mig/:orgId/jobs/:id/formal-accept
POST   /v1/mig/:orgId/health-scores
GET    /v1/mig/:orgId/health-scores
POST   /v1/mig/:orgId/tickets
PATCH  /v1/mig/:orgId/tickets/:id/status
POST   /v1/mig/:orgId/access-grants
POST   /v1/mig/:orgId/access-grants/:id/revoke
GET    /v1/mig/:orgId/dashboard
PUT    /v1/mig/:orgId/onboarding-config
```

## Cobertura de Testes

18 testes passando em `mig.service.spec.ts`.
