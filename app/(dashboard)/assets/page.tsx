import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { AssetsClient } from './assets-client';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch assets without join to avoid PostgREST relationship issues
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)
    .order('ticker');

  const assetList = assets ?? [];

  // Fetch price_cache separately for all user assets
  let priceMap: Record<string, { current_price: number; updated_at: string }> = {};
  if (assetList.length > 0) {
    const assetIds = assetList.map((a: any) => a.id);
    const { data: prices } = await supabase
      .from('price_cache')
      .select('asset_id, current_price, updated_at')
      .in('asset_id', assetIds);

    if (prices) {
      for (const p of prices) {
        priceMap[p.asset_id] = { current_price: p.current_price, updated_at: p.updated_at };
      }
    }
  }

  const mapped = assetList.map((a: any) => ({
    ...a,
    current_price: priceMap[a.id]?.current_price ?? null,
    price_updated_at: priceMap[a.id]?.updated_at ?? null,
  }));

  return (
    <div className="h-full flex flex-col">
      <Header title="Assets" subtitle="Manage stocks, ETFs and crypto" />
      <AssetsClient initialAssets={mapped} />
    </div>
  );
}
