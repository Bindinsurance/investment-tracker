-- ============================================================
-- Investment Tracker - Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  price_update_interval_hours INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BROKERS
-- ============================================================
CREATE TABLE brokers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACCOUNT TYPES
-- ============================================================
CREATE TABLE account_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tax_treatment TEXT NOT NULL CHECK (tax_treatment IN ('taxable', 'tax_advantaged')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE RESTRICT,
  account_type_id UUID NOT NULL REFERENCES account_types(id) ON DELETE RESTRICT,
  nickname TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  name TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto')),
  price_source TEXT CHECK (price_source IN ('alphavantage', 'twelvedata', 'coingecko', 'manual')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- ============================================================
-- IMPORT BATCHES
-- ============================================================
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  transaction_date DATE NOT NULL,
  total_amount NUMERIC(18, 8) NOT NULL CHECK (total_amount > 0),
  unit_price NUMERIC(18, 8) NOT NULL CHECK (unit_price > 0),
  quantity NUMERIC(18, 8) NOT NULL CHECK (quantity > 0),
  fee NUMERIC(18, 8) DEFAULT 0 CHECK (fee >= 0),
  notes TEXT,
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAX LOTS (created for each BUY transaction)
-- ============================================================
CREATE TABLE tax_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buy_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  acquisition_date DATE NOT NULL,
  original_quantity NUMERIC(18, 8) NOT NULL CHECK (original_quantity > 0),
  remaining_quantity NUMERIC(18, 8) NOT NULL CHECK (remaining_quantity >= 0),
  cost_basis_total NUMERIC(18, 8) NOT NULL CHECK (cost_basis_total >= 0),
  cost_basis_per_unit NUMERIC(18, 8) NOT NULL CHECK (cost_basis_per_unit > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REALIZED GAINS
-- ============================================================
CREATE TABLE realized_gains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sell_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  buy_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  tax_lot_id UUID NOT NULL REFERENCES tax_lots(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  acquisition_date DATE NOT NULL,
  sale_date DATE NOT NULL,
  quantity_sold NUMERIC(18, 8) NOT NULL CHECK (quantity_sold > 0),
  proceeds NUMERIC(18, 8) NOT NULL,
  cost_basis NUMERIC(18, 8) NOT NULL CHECK (cost_basis >= 0),
  gain_loss NUMERIC(18, 8) NOT NULL,
  holding_period_days INTEGER NOT NULL CHECK (holding_period_days >= 0),
  term TEXT NOT NULL CHECK (term IN ('short_term', 'long_term')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRICE CACHE
-- ============================================================
CREATE TABLE price_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  current_price NUMERIC(18, 8) NOT NULL CHECK (current_price >= 0),
  previous_close NUMERIC(18, 8),
  source TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id)
);

-- ============================================================
-- PORTFOLIO SNAPSHOTS
-- ============================================================
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value NUMERIC(18, 8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- ============================================================
-- TAX RATE SETTINGS
-- ============================================================
CREATE TABLE tax_rate_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  filing_status TEXT NOT NULL CHECK (filing_status IN ('single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household')),
  zero_percent_limit NUMERIC(12, 2) NOT NULL,
  fifteen_percent_limit NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tax_year, filing_status)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

CREATE INDEX idx_tax_lots_user_id ON tax_lots(user_id);
CREATE INDEX idx_tax_lots_account_asset ON tax_lots(account_id, asset_id);
CREATE INDEX idx_tax_lots_remaining ON tax_lots(remaining_quantity) WHERE remaining_quantity > 0;

CREATE INDEX idx_realized_gains_user_id ON realized_gains(user_id);
CREATE INDEX idx_realized_gains_sell_tx ON realized_gains(sell_transaction_id);
CREATE INDEX idx_realized_gains_sale_date ON realized_gains(sale_date);

CREATE INDEX idx_price_cache_asset ON price_cache(asset_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_brokers_user ON brokers(user_id);
CREATE INDEX idx_assets_user ON assets(user_id);
CREATE INDEX idx_assets_ticker ON assets(user_id, ticker);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brokers_updated_at BEFORE UPDATE ON brokers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_types_updated_at BEFORE UPDATE ON account_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_lots_updated_at BEFORE UPDATE ON tax_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_rate_settings_updated_at BEFORE UPDATE ON tax_rate_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_import_batches_updated_at BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- NOTE: SET search_path = public is required.
-- Without it, when Supabase Auth fires this trigger (in the 'auth' schema context),
-- it cannot resolve the unqualified table name 'profiles', causing
-- "Database error saving new user" on signup.

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
