import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateQuantityFromAmount } from '@/lib/calculations/fifo';
import { ParsedTransaction } from '@/types';
import { z } from 'zod';

const importSchema = z.object({
  rows: z.array(z.object({
    transaction_date: z.string(),
    transaction_type: z.enum(['buy', 'sell', 'dividend']),
    ticker: z.string(),
    quantity: z.number().min(0),
    unit_price: z.number().min(0),
    total_amount: z.number(),
    fee: z.number().min(0).default(0),
    notes: z.string().optional(),
  })),
  account_id: z.string().uuid(),
  file_name: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data: ' + parsed.error.errors[0]?.message }, { status: 400 });
    }

    const { rows, account_id, file_name } = parsed.data;

    // Verify account belongs to user
    const { data: account } = await supabase
      .from('accounts')
      .select('id, broker_id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Create import batch
    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        user_id: user.id,
        broker_id: account.broker_id,
        account_id,
        file_name,
        status: 'processing',
      })
      .select()
      .single();
    if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });

    let imported = 0;
    let skipped = 0;
    let duplicates = 0;

    // Load existing transactions for this account to detect duplicates
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('transaction_date, transaction_type, quantity, unit_price, asset_id')
      .eq('user_id', user.id)
      .eq('account_id', account_id);
    const existingTxList = existingTxs ?? [];

    for (const row of rows) {
      // Find or create asset
      let assetId: string;
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('ticker', row.ticker)
        .single();

      if (existingAsset) {
        assetId = existingAsset.id;
      } else {
        const { data: newAsset, error: assetError } = await supabase
          .from('assets')
          .insert({
            user_id: user.id,
            ticker: row.ticker,
            asset_type: 'stock', // Default; user can change later
            price_source: 'manual', // Yahoo Finance (free, no API key needed)
          })
          .select()
          .single();
        if (assetError) { skipped++; continue; }
        assetId = newAsset.id;
      }

      const isDividend = row.transaction_type === 'dividend';
      const totalAmount = row.total_amount || row.quantity * row.unit_price;
      const quantity = isDividend ? 0 : (row.quantity || calculateQuantityFromAmount(totalAmount, row.unit_price, row.fee));

      if (!isDividend && quantity <= 0) { skipped++; continue; }

      // Server-side duplicate check (safety net in case client didn't filter)
      const isDuplicate = existingTxList.some((t) => {
        if (t.asset_id !== assetId) return false;
        if (t.transaction_date !== row.transaction_date) return false;
        if (t.transaction_type !== row.transaction_type) return false;
        const qtyMatch = Math.abs(t.quantity - quantity) < Math.max(0.0001, quantity * 0.0001);
        const priceMatch = isDividend || Math.abs(t.unit_price - row.unit_price) < Math.max(0.01, row.unit_price * 0.0001);
        return qtyMatch && priceMatch;
      });
      if (isDuplicate) { duplicates++; continue; }

      // Insert transaction
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id,
          asset_id: assetId,
          transaction_type: row.transaction_type,
          transaction_date: row.transaction_date,
          total_amount: isDividend ? totalAmount : (totalAmount || quantity * row.unit_price),
          unit_price: isDividend ? 0 : row.unit_price,
          quantity,
          fee: row.fee,
          notes: row.notes || null,
          import_batch_id: batch.id,
        })
        .select()
        .single();

      if (txError) { skipped++; continue; }

      // Dividends: no tax lot or FIFO needed
      if (isDividend) { imported++; continue; }

      // For BUY: create tax lot
      if (row.transaction_type === 'buy') {
        const costBasisTotal = totalAmount - row.fee;
        await supabase.from('tax_lots').insert({
          user_id: user.id,
          buy_transaction_id: tx.id,
          asset_id: assetId,
          account_id,
          acquisition_date: row.transaction_date,
          original_quantity: quantity,
          remaining_quantity: quantity,
          cost_basis_total: costBasisTotal,
          cost_basis_per_unit: costBasisTotal / quantity,
        });
      }

      // For SELL: run FIFO
      if (row.transaction_type === 'sell') {
        const { data: lots } = await supabase
          .from('tax_lots')
          .select('*')
          .eq('user_id', user.id)
          .eq('account_id', account_id)
          .eq('asset_id', assetId)
          .gt('remaining_quantity', 0)
          .order('acquisition_date', { ascending: true });

        if (lots && lots.length > 0) {
          const { calculateFifo } = await import('@/lib/calculations/fifo');
          const fifoResult = calculateFifo(tx, lots);
          if (!fifoResult.insufficientQuantity) {
            for (const consumed of fifoResult.lotsConsumed) {
              await supabase.from('tax_lots').update({ remaining_quantity: consumed.remaining_after }).eq('id', consumed.tax_lot_id);
            }
            if (fifoResult.realizedGains.length > 0) {
              await supabase.from('realized_gains').insert(fifoResult.realizedGains.map((g) => ({ ...g, user_id: user.id })));
            }
          }
        }
      }

      imported++;
    }

    // Update batch status
    await supabase
      .from('import_batches')
      .update({ status: 'completed', rows_imported: imported, rows_skipped: skipped })
      .eq('id', batch.id);

    return NextResponse.json({ imported, skipped, duplicates, batch_id: batch.id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
