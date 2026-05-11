import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { TransactionsClient } from './transactions-client';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: transactions }, { data: accounts }, { data: assets }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts(*, broker:brokers(*), account_type:account_types(*)), asset:assets(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false }),
    supabase.from('accounts').select('*, broker:brokers(*), account_type:account_types(*)').eq('user_id', user.id).order('nickname'),
    supabase.from('assets').select('*').eq('user_id', user.id).eq('is_active', true).order('ticker'),
  ]);

  return (
    <div className="h-full flex flex-col">
      <Header title="Transactions" subtitle="Buys, sells and full history" />
      <TransactionsClient
        initialTransactions={transactions ?? []}
        accounts={accounts ?? []}
        assets={assets ?? []}
      />
    </div>
  );
}
