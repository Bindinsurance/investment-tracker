-- Migration 004: Add 'fee' to transaction_type enum
-- Fees charged by the broker (e.g. advisory fees, account fees) are tax-deductible
-- and must be recorded separately from trade transactions.

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'fee';
