// ============================================================
// Core Types
// ============================================================

export type AssetType = 'stock' | 'etf' | 'crypto';
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'fee';
export type TaxTreatment = 'taxable' | 'tax_advantaged';
export type TermType = 'short_term' | 'long_term';
export type PriceSource = 'alphavantage' | 'twelvedata' | 'coingecko' | 'manual';
export type FilingStatus = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household';
export type ThemePreference = 'light' | 'dark' | 'system';

// ============================================================
// Database Row Types
// ============================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  theme: ThemePreference;
  price_update_interval_hours: number;
  created_at: string;
  updated_at: string;
}

export interface Broker {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountType {
  id: string;
  user_id: string;
  name: string;
  tax_treatment: TaxTreatment;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  broker_id: string;
  account_type_id: string;
  nickname: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  broker?: Broker;
  account_type?: AccountType;
}

export interface Asset {
  id: string;
  user_id: string;
  ticker: string;
  name: string | null;
  asset_type: AssetType;
  price_source: PriceSource | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // From price_cache join
  current_price?: number | null;
  price_updated_at?: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  asset_id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  total_amount: number;
  unit_price: number;
  quantity: number;
  fee: number;
  notes: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  account?: Account;
  asset?: Asset;
}

export interface TaxLot {
  id: string;
  user_id: string;
  buy_transaction_id: string;
  asset_id: string;
  account_id: string;
  acquisition_date: string;
  original_quantity: number;
  remaining_quantity: number;
  cost_basis_total: number;
  cost_basis_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface RealizedGain {
  id: string;
  user_id: string;
  sell_transaction_id: string;
  buy_transaction_id: string;
  tax_lot_id: string;
  asset_id: string;
  account_id: string;
  acquisition_date: string;
  sale_date: string;
  quantity_sold: number;
  proceeds: number;
  cost_basis: number;
  gain_loss: number;
  holding_period_days: number;
  term: TermType;
  created_at: string;
  // Joined
  asset?: Asset;
  account?: Account;
}

export interface PriceCache {
  id: string;
  asset_id: string;
  current_price: number;
  previous_close: number | null;
  source: string;
  updated_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  created_at: string;
}

export interface TaxRateSetting {
  id: string;
  user_id: string;
  tax_year: number;
  filing_status: FilingStatus;
  zero_percent_limit: number;
  fifteen_percent_limit: number;
  created_at: string;
  updated_at: string;
}

export interface ImportBatch {
  id: string;
  user_id: string;
  broker_id: string;
  account_id: string;
  file_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  rows_imported: number;
  rows_skipped: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Portfolio / Dashboard Types
// ============================================================

export interface PortfolioPosition {
  asset: Asset;
  account: Account;
  quantity: number;
  avg_cost_basis: number;
  current_price: number;
  current_value: number;
  cost_basis_total: number;
  unrealized_gain_loss: number;
  unrealized_gain_loss_pct: number;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost_basis: number;
  total_unrealized_gain_loss: number;
  total_unrealized_gain_loss_pct: number;
  realized_gain_loss_ytd: number;
  by_broker: Record<string, number>;
  by_account_type: Record<string, number>;
  by_asset_type: Record<string, number>;
  positions: PortfolioPosition[];
  last_price_update: string | null;
}

export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

// ============================================================
// Form Types
// ============================================================

export interface BuyFormData {
  transaction_date: string;
  account_id: string;
  asset_id: string;
  total_amount: number;
  unit_price: number;
  fee: number;
  notes?: string;
}

export interface SellFormData {
  transaction_date: string;
  account_id: string;
  asset_id: string;
  quantity?: number;
  total_amount?: number;
  unit_price: number;
  fee: number;
  notes?: string;
  input_mode: 'quantity' | 'amount';
}

// ============================================================
// CSV Import Types
// ============================================================

export interface CsvRow {
  [key: string]: string;
}

export interface CsvColumnMapping {
  date: string;
  action: string;
  symbol: string;
  quantity: string;
  price: string;
  amount: string;
  fee: string;
  description?: string;
}

export interface ParsedTransaction {
  transaction_date: string;
  transaction_type: TransactionType | 'fee';
  ticker: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  fee: number;
  notes?: string;
  raw: CsvRow;
  isDuplicate?: boolean;
  error?: string;
}

export interface DividendFormData {
  transaction_date: string;
  account_id: string;
  asset_id: string;
  total_amount: number;
  notes?: string;
}

// ============================================================
// Report Types
// ============================================================

export interface ReportFilter {
  period: 'daily' | 'monthly' | 'annual' | 'custom';
  start_date: string;
  end_date: string;
  account_ids?: string[];
  asset_ids?: string[];
  broker_ids?: string[];
  taxable_only?: boolean;
}

export interface TaxReportRow {
  ticker: string;
  asset_name: string;
  broker: string;
  account: string;
  acquisition_date: string;
  sale_date: string;
  quantity_sold: number;
  proceeds: number;
  cost_basis: number;
  gain_loss: number;
  term: TermType;
  holding_days: number;
  tax_treatment: TaxTreatment;
}

// ============================================================
// API Response Types
// ============================================================

export interface PriceData {
  ticker: string;
  price: number;
  previous_close?: number;
  source: PriceSource;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code?: string;
}

export interface ActionResult<T = void> {
  data?: T;
  error?: string;
}
