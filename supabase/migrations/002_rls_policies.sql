-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- BROKERS
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own brokers" ON brokers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brokers" ON brokers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brokers" ON brokers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brokers" ON brokers FOR DELETE USING (auth.uid() = user_id);

-- ACCOUNT TYPES
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own account_types" ON account_types FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own account_types" ON account_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own account_types" ON account_types FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own account_types" ON account_types FOR DELETE USING (auth.uid() = user_id);

-- ACCOUNTS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- ASSETS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assets" ON assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON assets FOR DELETE USING (auth.uid() = user_id);

-- TRANSACTIONS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- TAX LOTS
ALTER TABLE tax_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tax_lots" ON tax_lots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tax_lots" ON tax_lots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tax_lots" ON tax_lots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tax_lots" ON tax_lots FOR DELETE USING (auth.uid() = user_id);

-- REALIZED GAINS
ALTER TABLE realized_gains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own realized_gains" ON realized_gains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own realized_gains" ON realized_gains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own realized_gains" ON realized_gains FOR DELETE USING (auth.uid() = user_id);

-- PRICE CACHE (shared read, but linked to user assets)
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view price_cache for own assets" ON price_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = price_cache.asset_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert price_cache for own assets" ON price_cache
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = price_cache.asset_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update price_cache for own assets" ON price_cache
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = price_cache.asset_id AND a.user_id = auth.uid()
    )
  );

-- PORTFOLIO SNAPSHOTS
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own snapshots" ON portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots" ON portfolio_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own snapshots" ON portfolio_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own snapshots" ON portfolio_snapshots FOR DELETE USING (auth.uid() = user_id);

-- IMPORT BATCHES
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own import_batches" ON import_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own import_batches" ON import_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own import_batches" ON import_batches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own import_batches" ON import_batches FOR DELETE USING (auth.uid() = user_id);

-- TAX RATE SETTINGS
ALTER TABLE tax_rate_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tax_rate_settings" ON tax_rate_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tax_rate_settings" ON tax_rate_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tax_rate_settings" ON tax_rate_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tax_rate_settings" ON tax_rate_settings FOR DELETE USING (auth.uid() = user_id);
