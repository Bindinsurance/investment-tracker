import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { AccountsClient } from './accounts-client';

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: accounts }, { data: brokers }, { data: accountTypes }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, broker:brokers(*), account_type:account_types(*)')
      .eq('user_id', user.id)
      .order('nickname'),
    supabase.from('brokers').select('*').eq('user_id', user.id).order('name'),
    supabase.from('account_types').select('*').eq('user_id', user.id).order('name'),
  ]);

  return (
    <div className="h-full flex flex-col">
      <Header title="Accounts" subtitle="Manage your investment accounts" />
      <AccountsClient
        initialAccounts={accounts ?? []}
        brokers={brokers ?? []}
        accountTypes={accountTypes ?? []}
      />
    </div>
  );
}
