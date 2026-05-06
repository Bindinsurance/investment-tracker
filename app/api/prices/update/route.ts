import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getProviderForAsset } from '@/lib/prices/provider';

async function updateAllPrices(supabase: Awaited<ReturnType<typeof createClient>>, userId?: string) {
  // Fetch active assets (for a specific user or all users via service role)
  let query = supabase.from('assets').select('*').eq('is_active', true);
  if (userId) query = query.eq('user_id', userId);

  const { data: assets, error } = await query;
  if (error || !assets || assets.length === 0) {
    return { updated: 0, errors: ['No assets found or query failed: ' + (error?.message ?? '')] };
  }

  const stockEtfAssets = assets.filter((a: any) => a.asset_type !== 'crypto');
  const cryptoAssets = assets.filter((a: any) => a.asset_type === 'crypto');

  let updated = 0;
  const errors: string[] = [];

  // Update stocks/ETFs
  if (stockEtfAssets.length > 0) {
    try {
      const provider = getProviderForAsset('stock', stockEtfAssets[0].price_source);
      const tickers = stockEtfAssets.map((a: any) => a.ticker);
      const prices = await provider.fetchPrices(tickers);

      if (prices.length === 0) {
        errors.push(`No prices returned for stock/ETF tickers: ${tickers.join(', ')}. Yahoo Finance may be unavailable.`);
      }

      for (const priceData of prices) {
        const asset = stockEtfAssets.find((a: any) => a.ticker === priceData.ticker);
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
      const tickers = cryptoAssets.map((a: any) => a.ticker);
      const prices = await provider.fetchPrices(tickers);

      for (const priceData of prices) {
        const asset = cryptoAssets.find((a: any) => a.ticker === priceData.ticker);
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

  // Save daily portfolio snapshot (only when called for a specific user)
  if (userId) {
    const { data: taxLots } = await supabase
      .from('tax_lots')
      .select('remaining_quantity, asset_id')
      .eq('user_id', userId)
      .gt('remaining_quantity', 0);

    const { data: priceCaches } = await supabase
      .from('price_cache')
      .select('asset_id, current_price');

    if (taxLots && priceCaches) {
      const priceMap = new Map(priceCaches.map((p: any) => [p.asset_id, p.current_price]));
      const totalValue = taxLots.reduce((sum: number, lot: any) => {
        const price = priceMap.get(lot.asset_id) ?? 0;
        return sum + lot.remaining_quantity * price;
      }, 0);

      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from('portfolio_snapshots')
        .upsert({ user_id: userId, snapshot_date: today, total_value: totalValue }, { onConflict: 'user_id,snapshot_date' });
    }
  }

  return { updated, errors };
}

// POST /api/prices/update — called by the UI "Update Prices" button (user auth)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await updateAllPrices(supabase, user.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/prices/update — called by Vercel cron job (verified via CRON_SECRET)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify cron secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to update ALL users' prices
    const supabase = await createServiceClient();
    const result = await updateAllPrices(supabase as any);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
