import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { ImportClient } from './import-client';

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: accounts }, { data: assets }, { data: transactions }] = await Promise.all([
    supabase.from('accounts').select('*, broker:brokers(*), account_type:account_types(*)').eq('user_id', user.id).eq('is_active', true).order('nickname'),
    supabase.from('assets').select('*').eq('user_id', user.id).order('ticker'),
    supabase.from('transactions').select('transaction_date, transaction_type, quantity, unit_price, asset:assets(ticker)').eq('user_id', user.id),
  ]);

  // Supabase returns joined asset as array — normalize to single object | null
  const existingTxns = (transactions ?? []).map((t) => ({
    transaction_date: t.transaction_date,
    transaction_type: t.transaction_type,
    quantity: t.quantity,
    unit_price: t.unit_price,
    asset: Array.isArray(t.asset) ? (t.asset[0] ?? null) : (t.asset as { ticker: string } | null),
  }));

  return (
    <div className="h-full flex flex-col">
      <Header title="Import CSV" subtitle="Import transactions from broker CSV files" />
      <ImportClient accounts={accounts ?? []} existingAssets={assets ?? []} existingTransactions={existingTxns} />
    </div>
  );
}
