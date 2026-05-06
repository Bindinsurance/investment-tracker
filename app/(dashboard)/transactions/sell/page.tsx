import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { SellFormClient } from './sell-form-client';

export default async function SellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: accounts }, { data: assets }] = await Promise.all([
    supabase.from('accounts').select('*, broker:brokers(*), account_type:account_types(*)').eq('user_id', user.id).eq('is_active', true).order('nickname'),
    supabase.from('assets').select('*').eq('user_id', user.id).eq('is_active', true).order('ticker'),
  ]);

  return (
    <div className="h-full flex flex-col">
      <Header title="New Sell" subtitle="Record a sale" />
      <SellFormClient accounts={accounts ?? []} assets={assets ?? []} />
    </div>
  );
}
