import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: taxSettings }, { data: accountTypes }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('tax_rate_settings').select('*').eq('user_id', user.id).order('tax_year', { ascending: false }),
    supabase.from('account_types').select('*').eq('user_id', user.id).order('name'),
  ]);

  return (
    <div className="h-full flex flex-col">
      <Header title="Settings" subtitle="Profile, tax settings and preferences" />
      <SettingsClient profile={profile} taxSettings={taxSettings ?? []} accountTypes={accountTypes ?? []} />
    </div>
  );
}
