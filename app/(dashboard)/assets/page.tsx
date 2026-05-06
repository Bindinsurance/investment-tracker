import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { AssetsClient } from './assets-client';

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: assets } = await supabase
    .from('assets')
    .select('*, price_cache(*)')
    .eq('user_id', user.id)
    .order('ticker');

  const mapped = (assets ?? []).map((a: any) => ({
    ...a,
    current_price: a.price_cache?.[0]?.current_price ?? null,
    price_updated_at: a.price_cache?.[0]?.updated_at ?? null,
  }));

  return (
    <div className="h-full flex flex-col">
      <Header title="Assets" subtitle="Manage stocks, ETFs and crypto" />
      <AssetsClient initialAssets={mapped} />
    </div>
  );
}
