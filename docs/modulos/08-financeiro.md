# Módulo 8 — FIN: Financeiro, Fiscal e Repasses

## Escopo

Lançamentos financeiros, contas a pagar/receber, registros de pagamento e
encerramento de período. Não contempla emissão de NF-e/NFS-e real (requer
integração com prefeituras), TISS/convênio (Sprint 2) ou split de repasse
automático para profissionais (marcado como fora de escopo nesta iteração).

## Requisitos Funcionais

| Código   | Descrição                                               | Status |
|----------|---------------------------------------------------------|--------|
| RF-FIN-001 | Contas financeiras (caixa, banco, digital)            | ✅     |
| RF-FIN-002 | Categorias de receita/despesa hierárquicas            | ✅     |
| RF-FIN-003 | Lançamentos com tipo, valor, vencimento, status       | ✅     |
| RF-FIN-004 | Registro de pagamentos parciais e totais              | ✅     |
| RF-FIN-005 | Estorno com referência ao pagamento original          | ✅     |
| RF-FIN-006 | Período contábil com fechamento (sem alter. retroativa)| ✅    |
| RF-FIN-007 | Geração idempotente de lançamento a partir de agenda  | ✅     |
| RF-FIN-008 | Audit trail completo de todas as operações            | ✅     |
| RF-FIN-009 | Dashboard com totais de receita/despesa/saldo         | ✅     |

## Restrições Técnicas

- Valores monetários: `NUMERIC(15,2)` / `Decimal` — nunca float
- Estorno referencia `paymentId` original — nunca apaga
- Período fechado: qualquer alteração em data dentro do período fechado
  retorna `ForbiddenException` sem exceções
- Idempotência: `idempotencyKey` único por lançamento e por pagamento
- Operações financeiras são transacionais (`$transaction`)
- Não declarar conformidade fiscal sem integração homologada

## Modelos Prisma

- `FinancialAccount` — contas financeiras com saldo inicial
- `FinancialCategory` — categorias hierárquicas (parentId)
- `FinancialTransaction` — lançamento com status, valor pago, referência
- `FinancialPayment` — pagamento com método, conta, estorno
- `FinancialPeriod` — período contábil mensal com estado ABERTO/FECHADO
