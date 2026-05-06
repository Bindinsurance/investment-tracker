import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buyFormSchema } from '@/lib/validators/transaction';
import { calculateQuantityFromAmount } from '@/lib/calculations/fifo';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = buyFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const { transaction_date, account_id, asset_id, total_amount, unit_price, fee = 0, notes } = parsed.data;
    const quantity = body.quantity ?? calculateQuantityFromAmount(total_amount, unit_price, fee);

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Calculated quantity must be greater than 0' }, { status: 400 });
    }

    // Verify account belongs to user
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Verify asset belongs to user
    const { data: asset } = await supabase
      .from('assets')
      .select('id')
      .eq('id', asset_id)
      .eq('user_id', user.id)
      .single();
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id,
        asset_id,
        transaction_type: 'buy',
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

    // Create tax lot
    const costBasisTotal = total_amount - fee;
    const { error: lotError } = await supabase
      .from('tax_lots')
      .insert({
        user_id: user.id,
        buy_transaction_id: transaction.id,
        asset_id,
        account_id,
        acquisition_date: transaction_date,
        original_quantity: quantity,
        remaining_quantity: quantity,
        cost_basis_total: costBasisTotal,
        cost_basis_per_unit: costBasisTotal / quantity,
      });

    if (lotError) {
      // Rollback transaction
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return NextResponse.json({ error: `Tax lot creation failed: ${lotError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
