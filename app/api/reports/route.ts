import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const taxableOnly = searchParams.get('taxable_only') === 'true';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    // Fetch realized gains with joins
    let query = supabase
      .from('realized_gains')
      .select(`
        *,
        asset:assets(ticker, name, asset_type),
        account:accounts(nickname, account_type:account_types(name, tax_treatment), broker:brokers(name))
      `)
      .eq('user_id', user.id)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date', { ascending: false });

    const { data: gains } = await query;

    // Filter taxable if requested
    const filteredGains = taxableOnly
      ? (gains ?? []).filter((g: any) => g.account?.account_type?.tax_treatment === 'taxable')
      : (gains ?? []);

    const realizedGains = filteredGains.map((g: any) => ({
      sale_date: g.sale_date,
      acquisition_date: g.acquisition_date,
      ticker: g.asset?.ticker,
      asset_name: g.asset?.name,
      account_nickname: g.account?.nickname,
      broker_name: g.account?.broker?.name,
      tax_treatment: g.account?.account_type?.tax_treatment,
      quantity_sold: g.quantity_sold,
      proceeds: g.proceeds,
      cost_basis: g.cost_basis,
      gain_loss: g.gain_loss,
      holding_period_days: g.holding_period_days,
      term: g.term,
    }));

    // Fetch transactions in period
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, asset:assets(ticker), account:accounts(nickname, broker:brokers(name))')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    // Summary
    const summary = {
      total_proceeds: realizedGains.reduce((s: number, g: any) => s + g.proceeds, 0),
      total_cost_basis: realizedGains.reduce((s: number, g: any) => s + g.cost_basis, 0),
      total_gain_loss: realizedGains.reduce((s: number, g: any) => s + g.gain_loss, 0),
      short_term_gain_loss: realizedGains.filter((g: any) => g.term === 'short_term').reduce((s: number, g: any) => s + g.gain_loss, 0),
      long_term_gain_loss: realizedGains.filter((g: any) => g.term === 'long_term').reduce((s: number, g: any) => s + g.gain_loss, 0),
      buy_count: (transactions ?? []).filter((t: any) => t.transaction_type === 'buy').length,
      sell_count: (transactions ?? []).filter((t: any) => t.transaction_type === 'sell').length,
      total_invested: (transactions ?? []).filter((t: any) => t.transaction_type === 'buy').reduce((s: number, t: any) => s + t.total_amount, 0),
    };

    return NextResponse.json({
      realized_gains: realizedGains,
      transactions: transactions ?? [],
      summary,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
