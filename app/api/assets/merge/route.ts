import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/assets/merge
// Merges all transactions, tax_lots and realized_gains from sourceAssetId into targetAssetId,
// then deletes the source asset. Used when a ticker was imported with the wrong symbol (e.g. CUSIP).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { source_asset_id, target_asset_id } = await req.json();
    if (!source_asset_id || !target_asset_id) {
      return NextResponse.json({ error: 'source_asset_id and target_asset_id are required' }, { status: 400 });
    }
    if (source_asset_id === target_asset_id) {
      return NextResponse.json({ error: 'Source and target must be different' }, { status: 400 });
    }

    // Verify both assets belong to user
    const { data: assets } = await supabase
      .from('assets')
      .select('id, ticker')
      .eq('user_id', user.id)
      .in('id', [source_asset_id, target_asset_id]);

    if (!assets || assets.length !== 2) {
      return NextResponse.json({ error: 'One or both assets not found' }, { status: 404 });
    }

    // Reassign transactions
    const { error: txError } = await supabase
      .from('transactions')
      .update({ asset_id: target_asset_id })
      .eq('asset_id', source_asset_id)
      .eq('user_id', user.id);
    if (txError) return NextResponse.json({ error: 'Failed to reassign transactions: ' + txError.message }, { status: 500 });

    // Reassign tax lots
    const { error: lotsError } = await supabase
      .from('tax_lots')
      .update({ asset_id: target_asset_id })
      .eq('asset_id', source_asset_id)
      .eq('user_id', user.id);
    if (lotsError) return NextResponse.json({ error: 'Failed to reassign tax lots: ' + lotsError.message }, { status: 500 });

    // Reassign realized gains
    const { error: gainsError } = await supabase
      .from('realized_gains')
      .update({ asset_id: target_asset_id })
      .eq('asset_id', source_asset_id)
      .eq('user_id', user.id);
    if (gainsError) return NextResponse.json({ error: 'Failed to reassign realized gains: ' + gainsError.message }, { status: 500 });

    // Delete the source asset
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', source_asset_id)
      .eq('user_id', user.id);
    if (deleteError) return NextResponse.json({ error: 'Failed to delete source asset: ' + deleteError.message }, { status: 500 });

    const target = assets.find((a) => a.id === target_asset_id);
    return NextResponse.json({ success: true, merged_into: target?.ticker });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
