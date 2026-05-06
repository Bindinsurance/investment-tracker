-- ============================================================
-- Migration 003: Add dividend transaction type
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Update transaction_type CHECK to include 'dividend'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check
  CHECK (transaction_type IN ('buy', 'sell', 'dividend'));

-- 2. Relax quantity and unit_price constraints to allow 0 (dividends have no qty/price)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_unit_price_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_unit_price_check
  CHECK (unit_price >= 0);

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_quantity_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_quantity_check
  CHECK (quantity >= 0);
