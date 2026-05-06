import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { BrokersClient } from './brokers-client';

export default async function BrokersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  return (
    <div className="h-full flex flex-col">
      <Header title="Brokers" subtitle="Manage your brokerage accounts" />
      <BrokersClient initialBrokers={brokers ?? []} />
    </div>
  );
}
