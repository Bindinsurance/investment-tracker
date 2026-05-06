import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { ReportsClient } from './reports-client';

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: accounts }, { data: brokers }, { data: taxSettings }] = await Promise.all([
    supabase.from('accounts').select('*, broker:brokers(*), account_type:account_types(*)').eq('user_id', user.id).order('nickname'),
    supabase.from('brokers').select('*').eq('user_id', user.id).order('name'),
    supabase.from('tax_rate_settings').select('*').eq('user_id', user.id).order('tax_year', { ascending: false }),
  ]);

  return (
    <div className="h-full flex flex-col">
      <Header title="Reports" subtitle="Daily, monthly, annual and tax reports" />
      <ReportsClient accounts={accounts ?? []} brokers={brokers ?? []} taxSettings={taxSettings ?? []} />
    </div>
  );
}
