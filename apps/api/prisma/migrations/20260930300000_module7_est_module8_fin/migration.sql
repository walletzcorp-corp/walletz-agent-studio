-- Módulo 7 (EST) e Módulo 8 (FIN)
-- IDs são TEXT (não UUID) para consistência com os demais modelos
-- Valores monetários e quantidades usam NUMERIC para evitar erros de ponto flutuante

-- Enums EST
CREATE TYPE "StockItemType" AS ENUM ('CONSUMIVEL','MEDICAMENTO','EQUIPAMENTO','MATERIAL');
CREATE TYPE "StockMovementType" AS ENUM (
  'ENTRADA','SAIDA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO',
  'PERDA','DESCARTE','DEVOLUCAO',
  'TRANSFERENCIA_SAIDA','TRANSFERENCIA_ENTRADA',
  'RESERVA','LIBERACAO_RESERVA','CONSUMO'
);
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDENTE','ENVIADO','RECEBIDO','DIVERGENCIA','CANCELADO');

-- Enums FIN
CREATE TYPE "TransactionType" AS ENUM ('RECEITA','DESPESA');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDENTE','PARCIALMENTE_PAGO','PAGO','CANCELADO','VENCIDO');
CREATE TYPE "PaymentMethod" AS ENUM (
  'DINHEIRO','CARTAO_CREDITO','CARTAO_DEBITO','PIX','TRANSFERENCIA','CONVENIO','OUTRO'
);

-- EST: Categorias
CREATE TABLE "stock_categories" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "stock_categories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stock_categories_organization_id_idx" ON "stock_categories"("organization_id");

-- EST: Itens
CREATE TABLE "stock_items" (
  "id"                  TEXT NOT NULL,
  "organization_id"     TEXT NOT NULL,
  "category_id"         TEXT,
  "code"                TEXT,
  "name"                TEXT NOT NULL,
  "description"         TEXT,
  "unit_of_measure"     TEXT NOT NULL,
  "presentation"        TEXT,
  "type"                "StockItemType" NOT NULL DEFAULT 'CONSUMIVEL',
  "requires_lot"        BOOLEAN NOT NULL DEFAULT FALSE,
  "requires_cold_chain" BOOLEAN NOT NULL DEFAULT FALSE,
  "min_stock"           NUMERIC(15,4),
  "max_stock"           NUMERIC(15,4),
  "active"              BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_items_organization_id_code_key" UNIQUE ("organization_id","code"),
  CONSTRAINT "stock_items_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "stock_categories"("id") ON DELETE SET NULL
);
CREATE INDEX "stock_items_organization_id_idx" ON "stock_items"("organization_id");

-- EST: Lotes
CREATE TABLE "stock_lots" (
  "id"                TEXT NOT NULL,
  "item_id"           TEXT NOT NULL,
  "organization_id"   TEXT NOT NULL,
  "lot_number"        TEXT NOT NULL,
  "supplier_name"     TEXT,
  "manufacturer_date" DATE,
  "expiry_date"       DATE,
  "unit_cost"         NUMERIC(15,4),
  "active"            BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_lots_item_id_lot_number_key" UNIQUE ("item_id","lot_number"),
  CONSTRAINT "stock_lots_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "stock_items"("id") ON DELETE CASCADE
);
CREATE INDEX "stock_lots_organization_id_idx" ON "stock_lots"("organization_id");

-- EST: Saldos (chave única: item + org + unidade)
CREATE TABLE "stock_balances" (
  "id"              TEXT NOT NULL,
  "item_id"         TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "unit_id"         TEXT NOT NULL,
  "quantity"        NUMERIC(15,4) NOT NULL DEFAULT 0,
  "reserved_qty"    NUMERIC(15,4) NOT NULL DEFAULT 0,
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_balances_item_org_unit_key" UNIQUE ("item_id","organization_id","unit_id"),
  CONSTRAINT "stock_balances_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "stock_items"("id") ON DELETE CASCADE
);
CREATE INDEX "stock_balances_organization_id_unit_id_idx" ON "stock_balances"("organization_id","unit_id");

-- EST: Movimentações (imutável após criação)
CREATE TABLE "stock_movements" (
  "id"               TEXT NOT NULL,
  "item_id"          TEXT NOT NULL,
  "lot_id"           TEXT,
  "organization_id"  TEXT NOT NULL,
  "unit_id"          TEXT NOT NULL,
  "type"             "StockMovementType" NOT NULL,
  "quantity"         NUMERIC(15,4) NOT NULL,
  "unit_cost"        NUMERIC(15,4),
  "total_cost"       NUMERIC(15,4),
  "reason"           TEXT,
  "reference_type"   TEXT,
  "reference_id"     TEXT,
  "idempotency_key"  TEXT,
  "performed_by"     TEXT NOT NULL,
  "performed_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "stock_movements_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_movements_lot_id_fkey"
    FOREIGN KEY ("lot_id") REFERENCES "stock_lots"("id") ON DELETE SET NULL
);
CREATE INDEX "stock_movements_item_organization_unit_idx" ON "stock_movements"("item_id","organization_id","unit_id");
CREATE INDEX "stock_movements_organization_performed_at_idx" ON "stock_movements"("organization_id","performed_at");

-- EST: Reservas
CREATE TABLE "stock_reservations" (
  "id"              TEXT NOT NULL,
  "item_id"         TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "unit_id"         TEXT NOT NULL,
  "quantity"        NUMERIC(15,4) NOT NULL,
  "reference_type"  TEXT NOT NULL,
  "reference_id"    TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'ATIVA',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "consumed_at"     TIMESTAMPTZ,
  "released_at"     TIMESTAMPTZ,
  CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_reservations_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT
);
CREATE INDEX "stock_reservations_organization_unit_idx" ON "stock_reservations"("organization_id","unit_id");
CREATE INDEX "stock_reservations_reference_idx" ON "stock_reservations"("reference_type","reference_id");

-- EST: Transferências
CREATE TABLE "stock_transfers" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "from_unit_id"    TEXT NOT NULL,
  "to_unit_id"      TEXT NOT NULL,
  "status"          "StockTransferStatus" NOT NULL DEFAULT 'PENDENTE',
  "notes"           TEXT,
  "requested_by"    TEXT NOT NULL,
  "requested_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "received_by"     TEXT,
  "received_at"     TIMESTAMPTZ,
  "cancelled_by"    TEXT,
  "cancelled_at"    TIMESTAMPTZ,
  "cancel_reason"   TEXT,
  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stock_transfers_organization_id_idx" ON "stock_transfers"("organization_id");

-- EST: Linhas de transferência
CREATE TABLE "stock_transfer_lines" (
  "id"              TEXT NOT NULL,
  "transfer_id"     TEXT NOT NULL,
  "item_id"         TEXT NOT NULL,
  "lot_id"          TEXT,
  "requested_qty"   NUMERIC(15,4) NOT NULL,
  "sent_qty"        NUMERIC(15,4),
  "received_qty"    NUMERIC(15,4),
  CONSTRAINT "stock_transfer_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfer_lines_transfer_id_fkey"
    FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE,
  CONSTRAINT "stock_transfer_lines_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_transfer_lines_lot_id_fkey"
    FOREIGN KEY ("lot_id") REFERENCES "stock_lots"("id") ON DELETE SET NULL
);
CREATE INDEX "stock_transfer_lines_transfer_id_idx" ON "stock_transfer_lines"("transfer_id");

-- FIN: Contas financeiras
CREATE TABLE "financial_accounts" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "bank_name"       TEXT,
  "account_number"  TEXT,
  "initial_balance" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "financial_accounts_organization_id_idx" ON "financial_accounts"("organization_id");

-- FIN: Categorias (hierárquicas)
CREATE TABLE "financial_categories" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "type"            "TransactionType" NOT NULL,
  "parent_id"       TEXT,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL
);
CREATE INDEX "financial_categories_organization_id_idx" ON "financial_categories"("organization_id");

-- FIN: Lançamentos
CREATE TABLE "financial_transactions" (
  "id"               TEXT NOT NULL,
  "organization_id"  TEXT NOT NULL,
  "unit_id"          TEXT,
  "category_id"      TEXT,
  "type"             "TransactionType" NOT NULL,
  "status"           "TransactionStatus" NOT NULL DEFAULT 'PENDENTE',
  "description"      TEXT NOT NULL,
  "amount"           NUMERIC(15,2) NOT NULL,
  "paid_amount"      NUMERIC(15,2) NOT NULL DEFAULT 0,
  "due_date"         DATE NOT NULL,
  "reference_type"   TEXT,
  "reference_id"     TEXT,
  "patient_id"       TEXT,
  "professional_id"  TEXT,
  "notes"            TEXT,
  "idempotency_key"  TEXT,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "cancelled_at"     TIMESTAMPTZ,
  "cancel_reason"    TEXT,
  CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_transactions_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "financial_transactions_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL
);
CREATE INDEX "financial_transactions_organization_due_date_idx" ON "financial_transactions"("organization_id","due_date");
CREATE INDEX "financial_transactions_organization_status_idx" ON "financial_transactions"("organization_id","status");
CREATE INDEX "financial_transactions_reference_idx" ON "financial_transactions"("reference_type","reference_id");

-- FIN: Pagamentos (inclui estorno — nunca deleta)
CREATE TABLE "financial_payments" (
  "id"               TEXT NOT NULL,
  "transaction_id"   TEXT NOT NULL,
  "account_id"       TEXT,
  "amount"           NUMERIC(15,2) NOT NULL,
  "method"           "PaymentMethod" NOT NULL DEFAULT 'DINHEIRO',
  "paid_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reversed_at"      TIMESTAMPTZ,
  "reversed_by"      TEXT,
  "reversal_reason"  TEXT,
  "notes"            TEXT,
  "idempotency_key"  TEXT,
  "recorded_by"      TEXT NOT NULL,
  CONSTRAINT "financial_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_payments_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "financial_payments_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT,
  CONSTRAINT "financial_payments_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL
);
CREATE INDEX "financial_payments_transaction_id_idx" ON "financial_payments"("transaction_id");

-- FIN: Períodos contábeis mensais
CREATE TABLE "financial_periods" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "year"            INTEGER NOT NULL,
  "month"           INTEGER NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'ABERTO',
  "closed_by"       TEXT,
  "closed_at"       TIMESTAMPTZ,
  "close_reason"    TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "financial_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_periods_org_year_month_key" UNIQUE ("organization_id","year","month")
);
