import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sellFormSchema } from '@/lib/validators/transaction';
import { calculateFifo, calculateSellQuantityFromAmount } from '@/lib/calculations/fifo';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = sellFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const { transaction_date, account_id, asset_id, unit_price, fee = 0, notes, input_mode } = parsed.data;

    // Calculate quantity
    let quantity: number;
    if (input_mode === 'amount') {
      const total_amount = parsed.data.total_amount!;
      quantity = calculateSellQuantityFromAmount(total_amount, unit_price, fee);
    } else {
      quantity = parsed.data.quantity!;
    }

    const total_amount = quantity * unit_price;

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    // Verify account
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Fetch available tax lots (FIFO order: oldest first)
    const { data: taxLots } = await supabase
      .from('tax_lots')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', account_id)
      .eq('asset_id', asset_id)
      .gt('remaining_quantity', 0)
      .order('acquisition_date', { ascending: true });

    if (!taxLots || taxLots.length === 0) {
      return NextResponse.json({ error: 'No available lots to sell for this asset in this account' }, { status: 400 });
    }

    // Create SELL transaction (temp object for FIFO calculation)
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id,
        asset_id,
        transaction_type: 'sell',
        transaction_date,
        total_amount,
        unit_price,
        quantity,
        fee,
        notes: notes || null,
      })
      .select()
      .single();

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

    // Run FIFO
    const fifoResult = calculateFifo(transaction, taxLots);

    if (fifoResult.insufficientQuantity) {
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return NextResponse.json({
        error: `Insufficient quantity. Available: ${fifoResult.availableQuantity.toFixed(8)}, Requested: ${quantity.toFixed(8)}`
      }, { status: 400 });
    }

    // Update tax lots
    for (const consumed of fifoResult.lotsConsumed) {
      const { error } = await supabase
        .from('tax_lots')
        .update({ remaining_quantity: consumed.remaining_after })
        .eq('id', consumed.tax_lot_id);
      if (error) {
        await supabase.from('transactions').delete().eq('id', transaction.id);
        return NextResponse.json({ error: `Failed to update tax lot: ${error.message}` }, { status: 500 });
      }
    }

    // Insert realized gains
    const gainsToInsert = fifoResult.realizedGains.map((g) => ({ ...g, user_id: user.id }));
    if (gainsToInsert.length > 0) {
      const { error: gainsError } = await supabase.from('realized_gains').insert(gainsToInsert);
      if (gainsError) {
        return NextResponse.json({ error: `Failed to record realized gains: ${gainsError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      fifo_summary: {
        total_proceeds: fifoResult.totalProceeds,
        total_cost_basis: fifoResult.totalCostBasis,
        total_gain_loss: fifoResult.totalGainLoss,
        lots_consumed: fifoResult.lotsConsumed.length,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
