# Módulo 7 — EST: Estoque, Compras e Rastreabilidade

## Escopo

Controle de estoque de insumos, medicamentos e equipamentos consumíveis em
clínicas e unidades de saúde. Não contempla farmácia hospitalar completa,
SNGPC ou rastreabilidade ANVISA de psicotrópicos (requer integração futura).

## Requisitos Funcionais

| Código   | Descrição                                               | Status |
|----------|---------------------------------------------------------|--------|
| RF-EST-001 | Cadastro de itens com categoria, código e UoM         | ✅     |
| RF-EST-002 | Gestão de lotes (número de lote, validade, fornecedor)| ✅     |
| RF-EST-003 | Saldo por item/unidade com atualização atômica        | ✅     |
| RF-EST-004 | Movimentações (entrada, saída, ajuste, perda, descarte)| ✅    |
| RF-EST-005 | Reserva de itens vinculada a agendamentos             | ✅     |
| RF-EST-006 | Transferência entre unidades (envio + recebimento)    | ✅     |
| RF-EST-007 | Alertas de estoque mínimo                             | ✅     |
| RF-EST-008 | Idempotência: chave única por movimentação            | ✅     |
| RF-EST-009 | Não permite saldo negativo (sem justificativa)        | ✅     |
| RF-EST-010 | Rastreabilidade: histórico completo preservado        | ✅     |

## Restrições Técnicas

- Quantidades: `NUMERIC(15,4)` — nunca ponto flutuante binário
- IDs: TEXT com UUID gerado no backend
- Saldo e movimento atualizados atomicamente em `$transaction`
- Tenant: organizationId sempre derivado do JWT
- Reserva ≠ consumo: estados ATIVA / CONSUMIDA / LIBERADA são explícitos
- Histórico nunca deletado: ajustes criam novos registros; movimentos são
  imutáveis após criação

## Modelos Prisma

- `StockCategory` — categorização
- `StockItem` — cadastro de item com campos de tipo, UoM, limites
- `StockLot` — rastreabilidade por lote
- `StockBalance` — saldo atual por item/org/unidade (chave única)
- `StockMovement` — log imutável de cada movimentação
- `StockReservation` — reserva vinculada a referência (appointment, etc.)
- `StockTransfer` — cabeçalho de transferência inter-unidade
- `StockTransferLine` — linha com item/lote/qtds solicitada/enviada/recebida
