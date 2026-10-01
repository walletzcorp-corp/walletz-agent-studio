# Matriz de Integrações — Módulos 1 a 21

**Data:** 2026-10-01  
**Versão:** 1-21

## Convenções

- **→** Produz / fornece dados para
- **←** Consome dados de
- **↔** Bidirecional

## Mapa de Dependências

| Módulo | Produz para | Consome de |
|---|---|---|
| M1 ORG | Todos os módulos (organizationId) | — |
| M2 UNI | M5, M6, M7, M14, M16, M17 | M1 |
| M3 USR | Todos (autenticação JWT) | M1 |
| M4 PRO | M6, M9, M11, M13, M17, M18 | M1, M2, M3 |
| M5 REC | M6 | M1, M2 |
| M6 SVC | M8 (faturamento), M9 (guias) | M1, M2, M4, M5 |
| M7 EST | M14 (medicamentos) | M1, M2 |
| M8 FIN | — | M1, M6, M9 |
| M9 TIS | M8 (contas a receber) | M1, M4, M6 |
| M10 CRM | M18 (perfil público) | M1, M4, M5 |
| M11 IA | M7 (sugestão de estoque) | M1, M4, M7, M14 |
| M12 INT | Todos (webhooks externos) | M1, M3 |
| M13 SAL | — | M1, M4 |
| M14 MED | M7 (baixa de estoque), M8 (custo) | M1, M4, M7 |
| M15 QUA | M12 (notificação externa) | M1, M2, M4, M14 |
| M16 ATI | M7 (insumos), M8 (custo) | M1, M2, M7 |
| M17 EQP | M4 (profissionais) | M1, M2, M4 |
| M18 ENG | M10 (pipeline CRM) | M1, M4, M5 |
| M19 DIA | M8 (faturamento de exames) | M1, M4, M5, M6 |
| M20 NCD | M15 (incidentes), M17 (escalas) | M1 |
| M21 MIG | Todos (importação de dados) | M1, M3 |

## Integrações Externas Declaradas

| Módulo | Sistema Externo | Status |
|---|---|---|
| M9 TIS | TISS (ANS) — XML SADT | Implementado (mock/real) |
| M12 INT | Webhooks genéricos | Implementado |
| M15 QUA | NOTIVISA (ANVISA) — prep. humana | Implementado (sem envio auto) |
| M19 DIA | RIS/PACS | Requer provedor externo configurado |
| M12 INT | HL7 FHIR | Planejado F3 |

## Integrações Internas Críticas

### M14 MED ↔ M7 EST
Administração de medicamento gera baixa automática no estoque. Lote vencido no estoque bloqueia administração.

### M19 DIA → M8 FIN
Resultado liberado de exame gera lançamento financeiro (cobrança ao convênio ou particular).

### M20 NCD → M15 QUA
Template de formulário de incidente gerenciado pelo Studio; campos não podem ser removidos retroativamente.

### M21 MIG → Todos
Jobs de migração importam dados de todos os módulos. Isolamento por organizationId mantido durante importação.

## Segurança Transversal

- Todos os módulos validam `organizationId` via `assertAccess()` antes de qualquer operação de escrita
- JWT nunca contém `organizationId` do frontend — sempre do token
- `PrismaService` injetado via módulo — sem acesso direto a `new PrismaClient()`
- `$transaction` utilizado em operações atômicas críticas: M15, M19, M20
