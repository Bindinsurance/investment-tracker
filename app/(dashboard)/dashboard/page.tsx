import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from './dashboard-client';
import { Header } from '@/components/layout/header';
import { buildPortfolioPositions, buildPortfolioSummary } from '@/lib/calculations/portfolio';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;

  // Fetch tax lots with relations
  const { data: taxLots } = await supabase
    .from('tax_lots')
    .select(`
      *,
      asset:assets(*),
      account:accounts(*, broker:brokers(*), account_type:account_types(*))
    `)
    .eq('user_id', user.id)
    .gt('remaining_quantity', 0);

  // Fetch price cache
  const { data: priceCache } = await supabase
    .from('price_cache')
    .select('*');

  // Build price map
  const priceMap = new Map((priceCache ?? []).map((p) => [p.asset_id, p]));

  // Fetch realized gains YTD
  const { data: realizedYtd } = await supabase
    .from('realized_gains')
    .select('gain_loss')
    .eq('user_id', user.id)
    .gte('sale_date', yearStart);

  const realizedGainLossYtd = (realizedYtd ?? []).reduce((sum, r) => sum + r.gain_loss, 0);

  // Build portfolio
  const inputs = (taxLots ?? []).map((lot: any) => ({
    lot,
    asset: lot.asset,
    account: lot.account,
    priceCache: priceMap.get(lot.asset_id) ?? null,
  }));

  const positions = buildPortfolioPositions(inputs);
  const lastPriceUpdate = priceCache && priceCache.length > 0
    ? priceCache.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at
    : null;

  const summary = buildPortfolioSummary(positions, realizedGainLossYtd, lastPriceUpdate);

  // Fetch portfolio snapshots for chart
  const { data: snapshots } = await supabase
    .from('portfolio_snapshots')
    .select('snapshot_date, total_value')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: true })
    .limit(30);

  return (
    <div className="h-full flex flex-col">
      <Header title="Dashboard" subtitle="Portfolio overview" />
      <DashboardClient summary={summary} snapshots={snapshots ?? []} />
    </div>
  );
}
