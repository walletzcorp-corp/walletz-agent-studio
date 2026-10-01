# Módulo 9 — Convênios, TISS e Glosas (TIS)

## Escopo

RF-TIS-001 a RF-TIS-010 — Gestão completa de faturamento a convênios: operadoras, planos, contratos, tabela TUSS, guias TISS, lotes, glosas e recursos de glosa.

## Componentes Implementados

### Backend

| Arquivo | Descrição |
|---------|-----------|
| `apps/api/src/modules/tis/services/tis.service.ts` | Serviço principal com toda lógica de negócio |
| `apps/api/src/modules/tis/tis.controller.ts` | Controller REST versão 1 |
| `apps/api/src/modules/tis/tis.module.ts` | Módulo NestJS |
| `apps/api/src/modules/tis/services/tis.service.spec.ts` | 30 testes unitários |

### Schema (Prisma)

- `InsuranceCarrier` — Operadoras com código ANS único por organização
- `InsurancePlan` — Planos vinculados a operadoras
- `InsuranceContract` — Contratos com versão TISS, códigos operadora/prestador
- `TussCode` — Tabela TUSS versionada (único por org+código+versão)
- `InsuranceGuide` + `InsuranceGuideItem` — Guias com itens NUMERIC(15,2)
- `InsuranceLot` + `InsuranceLotItem` — Lotes de faturamento mensal
- `InsuranceClaim` + `InsuranceClaimAppeal` — Glosas e recursos de glosa

### Frontend

| Rota | Página |
|------|--------|
| `/convenios` | Dashboard com indicadores por operadora |
| `/convenios/operadoras` | Listagem e cadastro de operadoras |
| `/convenios/guias` | Guias TISS com filtro por status |
| `/convenios/lotes` | Lotes, fechamento e exportação XML |
| `/convenios/glosas` | Glosas e interposição de recursos |

## Endpoints REST (prefixo `/api/v1/tis`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/operadoras` | Lista operadoras ativas |
| POST | `/operadoras` | Cria operadora |
| PATCH | `/operadoras/:id` | Atualiza operadora |
| POST | `/operadoras/:carrierId/planos` | Cria plano |
| GET | `/contratos` | Lista contratos |
| POST | `/contratos` | Cria contrato |
| GET | `/tuss` | Busca códigos TUSS |
| POST | `/tuss` | Upsert código TUSS |
| GET | `/guias` | Lista guias (filtro: contractId, status, from, to) |
| POST | `/guias` | Cria guia (idempotente via idempotencyKey) |
| POST | `/guias/:id/validar` | Valida guia, registra erros |
| PATCH | `/guias/:id/status` | Atualiza status da guia |
| GET | `/lotes` | Lista lotes |
| POST | `/lotes` | Cria lote em transação |
| POST | `/lotes/:id/fechar` | Fecha lote ABERTO |
| POST | `/lotes/:id/exportar-xml` | Gera XML TISS (simulação) |
| GET | `/glosas` | Lista glosas |
| POST | `/glosas` | Registra glosa |
| POST | `/glosas/:id/recurso` | Interpõe recurso de glosa |
| GET | `/indicadores` | Indicadores por operadora |

## Regras de Negócio Implementadas

1. **Isolamento de tenant**: todo acesso valida `organizationId` via `assertAccess()`
2. **Idempotência de guias**: `idempotencyKey` único — requisição repetida retorna guia existente
3. **Valores NUMERIC**: `InsuranceGuideItem.quantity`, `unitValue`, `totalValue` e `InsuranceClaim.glosedValue` são `Decimal` — nunca `float`
4. **Transações atômicas**: `createGuide`, `createLot`, `createClaim`, `createAppeal` usam `$transaction`
5. **Guia cancelada imutável**: `updateGuideStatus` rejeita alteração de guia `CANCELADO`
6. **Lote**: somente guias da organização são aceitas; lote sem guias é rejeitado
7. **Fechamento de lote**: somente `ABERTO` → `FECHADO`
8. **XML TISS em simulação**: exportação claramente marcada; transmissão real requer credencial, endpoint e homologação ANS
9. **Glosa**: ao criar, guia vai para `GLOSADO` na mesma transação
10. **Recurso de glosa**: somente para glosas não resolvidas; atualiza status para `RECURSO`
11. **Histórico preservado**: nenhum movimento é apagado; glosas e recursos preservam trilha

## Declaração de Simulação TISS

> **ATENÇÃO**: O XML gerado pelo endpoint `/lotes/:id/exportar-xml` está em **modo SIMULAÇÃO**.  
> Não representa transmissão real para operadora.  
> Integração real requer: credenciais ANS, endpoint de homologação, certificado digital e retorno validado pela operadora.  
> A versão TISS aplicável é a registrada no contrato (`tissVersion`).
