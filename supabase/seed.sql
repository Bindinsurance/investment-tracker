-- ============================================================
-- Seed Data - Run AFTER creating your first user account
-- Replace 'YOUR_USER_ID' with your actual auth.users UUID
-- ============================================================

-- To find your user ID after signup:
-- SELECT id FROM auth.users WHERE email = 'your@email.com';

-- Example usage (uncomment and replace YOUR_USER_ID):

/*
-- Insert Brokers
INSERT INTO brokers (user_id, name) VALUES
  ('YOUR_USER_ID', 'Fidelity'),
  ('YOUR_USER_ID', 'Vanguard'),
  ('YOUR_USER_ID', 'Coinbase'),
  ('YOUR_USER_ID', 'Robinhood'),
  ('YOUR_USER_ID', 'Webull');

-- Insert Account Types
INSERT INTO account_types (user_id, name, tax_treatment) VALUES
  ('YOUR_USER_ID', 'Brokerage',        'taxable'),
  ('YOUR_USER_ID', 'Roth IRA',         'tax_advantaged'),
  ('YOUR_USER_ID', 'Traditional IRA',  'tax_advantaged'),
  ('YOUR_USER_ID', 'Solo 401k',        'tax_advantaged'),
  ('YOUR_USER_ID', 'HSA',              'tax_advantaged'),
  ('YOUR_USER_ID', 'Crypto Account',   'taxable');

-- Insert Tax Rate Settings (2024)
INSERT INTO tax_rate_settings (user_id, tax_year, filing_status, zero_percent_limit, fifteen_percent_limit) VALUES
  ('YOUR_USER_ID', 2024, 'single',                    47025,  518900),
  ('YOUR_USER_ID', 2024, 'married_filing_jointly',    94050, 583750),
  ('YOUR_USER_ID', 2024, 'married_filing_separately', 47025, 291850),
  ('YOUR_USER_ID', 2024, 'head_of_household',         63000, 551350),
  ('YOUR_USER_ID', 2025, 'single',                    48350, 533400),
  ('YOUR_USER_ID', 2025, 'married_filing_jointly',    96700, 600050),
  ('YOUR_USER_ID', 2025, 'married_filing_separately', 48350, 300000),
  ('YOUR_USER_ID', 2025, 'head_of_household',         64750, 566700);
*/

-- NOTE: The app will auto-seed brokers and account types on first login
-- via the onboarding flow if none exist for the user.
