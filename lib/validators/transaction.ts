import { z } from 'zod';

export const buyFormSchema = z.object({
  transaction_date: z.string().min(1, 'Date is required'),
  account_id: z.string().uuid('Invalid account'),
  asset_id: z.string().uuid('Invalid asset'),
  total_amount: z
    .number({ invalid_type_error: 'Must be a number' })
    .positive('Must be greater than 0'),
  unit_price: z
    .number({ invalid_type_error: 'Must be a number' })
    .positive('Must be greater than 0'),
  fee: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Fee cannot be negative')
    .default(0),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const sellFormSchema = z
  .object({
    transaction_date: z.string().min(1, 'Date is required'),
    account_id: z.string().uuid('Invalid account'),
    asset_id: z.string().uuid('Invalid asset'),
    input_mode: z.enum(['quantity', 'amount']),
    quantity: z.number({ invalid_type_error: 'Must be a number' }).positive().optional(),
    total_amount: z.number({ invalid_type_error: 'Must be a number' }).positive().optional(),
    unit_price: z
      .number({ invalid_type_error: 'Must be a number' })
      .positive('Must be greater than 0'),
    fee: z
      .number({ invalid_type_error: 'Must be a number' })
      .min(0, 'Fee cannot be negative')
      .default(0),
    notes: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.input_mode === 'quantity') return data.quantity != null && data.quantity > 0;
      return data.total_amount != null && data.total_amount > 0;
    },
    {
      message: 'Quantity or amount is required',
      path: ['quantity'],
    }
  );

export const assetFormSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(20, 'Ticker too long')
    .transform((v) => v.toUpperCase().trim()),
  name: z.string().max(200).optional().or(z.literal('')),
  asset_type: z.enum(['stock', 'etf', 'crypto']),
  price_source: z.enum(['alphavantage', 'twelvedata', 'coingecko', 'manual']).optional(),
  is_active: z.boolean().default(true),
});

export const brokerFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const accountTypeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  tax_treatment: z.enum(['taxable', 'tax_advantaged']),
  description: z.string().max(500).optional().or(z.literal('')),
});

export const accountFormSchema = z.object({
  broker_id: z.string().uuid('Invalid broker'),
  account_type_id: z.string().uuid('Invalid account type'),
  nickname: z.string().min(1, 'Nickname is required').max(100, 'Nickname too long').trim(),
  notes: z.string().max(500).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export const taxRateSettingSchema = z.object({
  tax_year: z.number().int().min(2020).max(2030),
  filing_status: z.enum([
    'single',
    'married_filing_jointly',
    'married_filing_separately',
    'head_of_household',
  ]),
  zero_percent_limit: z.number().positive(),
  fifteen_percent_limit: z.number().positive(),
});

export type BuyFormValues = z.infer<typeof buyFormSchema>;
export type SellFormValues = z.infer<typeof sellFormSchema>;
export type AssetFormValues = z.infer<typeof assetFormSchema>;
export type BrokerFormValues = z.infer<typeof brokerFormSchema>;
export type AccountTypeFormValues = z.infer<typeof accountTypeFormSchema>;
export type AccountFormValues = z.infer<typeof accountFormSchema>;
export type TaxRateSettingValues = z.infer<typeof taxRateSettingSchema>;
