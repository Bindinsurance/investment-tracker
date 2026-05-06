import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProviderForAsset } from '@/lib/prices/provider';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all active assets for this user
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error || !assets) return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });

    // Group by price source/type
    const stockEtfAssets = assets.filter((a) => a.asset_type !== 'crypto');
    const cryptoAssets = assets.filter((a) => a.asset_type === 'crypto');

    let updated = 0;
    const errors: string[] = [];

    // Update stocks/ETFs
    if (stockEtfAssets.length > 0) {
      try {
        const provider = getProviderForAsset('stock', stockEtfAssets[0].price_source);
        const tickers = stockEtfAssets.map((a) => a.ticker);
        const prices = await provider.fetchPrices(tickers);

        for (const priceData of prices) {
          const asset = stockEtfAssets.find((a) => a.ticker === priceData.ticker);
          if (!asset) continue;

          const { error: upsertError } = await supabase
            .from('price_cache')
            .upsert({
              asset_id: asset.id,
              current_price: priceData.price,
              previous_close: priceData.previous_close ?? null,
              source: priceData.source,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'asset_id' });

          if (!upsertError) updated++;
          else errors.push(`${priceData.ticker}: ${upsertError.message}`);
        }
      } catch (e) {
        errors.push(`Stock/ETF price fetch failed: ${e}`);
      }
    }

    // Update crypto
    if (cryptoAssets.length > 0) {
      try {
        const provider = getProviderForAsset('crypto');
        const tickers = cryptoAssets.map((a) => a.ticker);
        const prices = await provider.fetchPrices(tickers);

        for (const priceData of prices) {
          const asset = cryptoAssets.find((a) => a.ticker === priceData.ticker);
          if (!asset) continue;

          const { error: upsertError } = await supabase
            .from('price_cache')
            .upsert({
              asset_id: asset.id,
              current_price: priceData.price,
              source: priceData.source,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'asset_id' });

          if (!upsertError) updated++;
          else errors.push(`${priceData.ticker}: ${upsertError.message}`);
        }
      } catch (e) {
        errors.push(`Crypto price fetch failed: ${e}`);
      }
    }

    // Save daily portfolio snapshot
    const { data: taxLots } = await supabase
      .from('tax_lots')
      .select('remaining_quantity, asset_id')
      .eq('user_id', user.id)
      .gt('remaining_quantity', 0);

    const { data: priceCaches } = await supabase
      .from('price_cache')
      .select('asset_id, current_price');

    if (taxLots && priceCaches) {
      const priceMap = new Map(priceCaches.map((p) => [p.asset_id, p.current_price]));
      const totalValue = taxLots.reduce((sum, lot) => {
        const price = priceMap.get(lot.asset_id) ?? 0;
        return sum + lot.remaining_quantity * price;
      }, 0);

      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from('portfolio_snapshots')
        .upsert({ user_id: user.id, snapshot_date: today, total_value: totalValue }, { onConflict: 'user_id,snapshot_date' });
    }

    return NextResponse.json({ updated, errors: errors.length > 0 ? errors : undefined });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
