import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const asset_id = searchParams.get('asset_id');
    const account_id = searchParams.get('account_id');

    if (!asset_id || !account_id) {
      return NextResponse.json({ error: 'asset_id and account_id required' }, { status: 400 });
    }

    const { data: lots } = await supabase
      .from('tax_lots')
      .select('remaining_quantity')
      .eq('user_id', user.id)
      .eq('asset_id', asset_id)
      .eq('account_id', account_id)
      .gt('remaining_quantity', 0);

    const quantity = (lots ?? []).reduce((sum, l) => sum + l.remaining_quantity, 0);

    return NextResponse.json({ quantity });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
