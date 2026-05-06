'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Info } from 'lucide-react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { taxRateSettingSchema, TaxRateSettingValues, accountTypeFormSchema, AccountTypeFormValues } from '@/lib/validators/transaction';
import { Profile, TaxRateSetting, AccountType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface Props { profile: Profile | null; taxSettings: TaxRateSetting[]; accountTypes: AccountType[]; }

const FILING_STATUS_LABELS: Record<string, string> = {
  single: 'Single',
  married_filing_jointly: 'Married Filing Jointly',
  married_filing_separately: 'Married Filing Separately',
  head_of_household: 'Head of Household',
};

export function SettingsClient({ profile, taxSettings: initialTaxSettings, accountTypes: initialAccountTypes }: Props) {
  const [taxSettings, setTaxSettings] = useState(initialTaxSettings);
  const [accountTypes, setAccountTypes] = useState(initialAccountTypes);
  const [taxOpen, setTaxOpen] = useState(false);
  const [atOpen, setAtOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRateSetting | null>(null);
  const [editingAt, setEditingAt] = useState<AccountType | null>(null);
  const { toast } = useToast();

  const taxForm = useForm<TaxRateSettingValues>({ resolver: zodResolver(taxRateSettingSchema) });
  const atForm = useForm<AccountTypeFormValues>({ resolver: zodResolver(accountTypeFormSchema) });

  const onSubmitTax = async (values: TaxRateSettingValues) => {
    const supabase = createClient();
    if (editingTax) {
      const { error } = await supabase.from('tax_rate_settings').update(values).eq('id', editingTax.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setTaxSettings(taxSettings.map((t) => t.id === editingTax.id ? { ...t, ...values } : t));
      toast({ title: 'Tax setting updated' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('tax_rate_settings').insert({ user_id: user!.id, ...values }).select().single();
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setTaxSettings([data, ...taxSettings]);
      toast({ title: 'Tax setting added' });
    }
    setTaxOpen(false);
  };

  const onSubmitAt = async (values: AccountTypeFormValues) => {
    const supabase = createClient();
    if (editingAt) {
      const { error } = await supabase.from('account_types').update(values).eq('id', editingAt.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setAccountTypes(accountTypes.map((a) => a.id === editingAt.id ? { ...a, ...values } : a));
      toast({ title: 'Account type updated' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('account_types').insert({ user_id: user!.id, ...values }).select().single();
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setAccountTypes([...accountTypes, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Account type created' });
    }
    setAtOpen(false);
  };

  const seedAccountTypes = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const defaults = [
      { name: 'Brokerage', tax_treatment: 'taxable' },
      { name: 'Roth IRA', tax_treatment: 'tax_advantaged' },
      { name: 'Traditional IRA', tax_treatment: 'tax_advantaged' },
      { name: 'Solo 401k', tax_treatment: 'tax_advantaged' },
      { name: 'HSA', tax_treatment: 'tax_advantaged' },
      { name: 'Crypto Account', tax_treatment: 'taxable' },
    ];
    const existing = new Set(accountTypes.map((a) => a.name));
    const toInsert = defaults.filter((d) => !existing.has(d.name)).map((d) => ({ ...d, user_id: user!.id }));
    if (toInsert.length === 0) { toast({ title: 'Already set up' }); return; }
    const { data, error } = await supabase.from('account_types').insert(toInsert).select();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setAccountTypes([...accountTypes, ...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: 'Default account types added' });
  };

  const deleteAt = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('account_types').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setAccountTypes(accountTypes.filter((a) => a.id !== id));
    toast({ title: 'Account type deleted' });
  };

  return (
    <div className="p-6 max-w-3xl">
      <Tabs defaultValue="account-types">
        <TabsList>
          <TabsTrigger value="account-types">Account Types</TabsTrigger>
          <TabsTrigger value="tax">Tax Settings</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Account Types */}
        <TabsContent value="account-types" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Account Types</h2>
              <p className="text-sm text-muted-foreground">Configure taxable vs tax-advantaged accounts</p>
            </div>
            <div className="flex gap-2">
              {accountTypes.length === 0 && (
                <Button variant="outline" size="sm" onClick={seedAccountTypes}>Add defaults</Button>
              )}
              <Dialog open={atOpen} onOpenChange={setAtOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingAt(null); atForm.reset({ name: '', tax_treatment: 'taxable' }); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingAt ? 'Edit Account Type' : 'Add Account Type'}</DialogTitle></DialogHeader>
                  <form onSubmit={atForm.handleSubmit(onSubmitAt)} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input placeholder="e.g. Roth IRA" {...atForm.register('name')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Treatment *</Label>
                      <Select onValueChange={(v) => atForm.setValue('tax_treatment', v as any)} defaultValue={editingAt?.tax_treatment ?? 'taxable'}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="taxable">Taxable</SelectItem>
                          <SelectItem value="tax_advantaged">Tax-Advantaged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setAtOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={atForm.formState.isSubmitting}>{editingAt ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tax Treatment</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountTypes.map((at) => (
                  <TableRow key={at.id}>
                    <TableCell className="font-medium">{at.name}</TableCell>
                    <TableCell>
                      <Badge variant={at.tax_treatment === 'taxable' ? 'default' : 'secondary'}>
                        {at.tax_treatment === 'taxable' ? 'Taxable' : 'Tax-Advantaged'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingAt(at); atForm.reset({ name: at.name, tax_treatment: at.tax_treatment }); setAtOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAt(at.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tax Settings */}
        <TabsContent value="tax" className="mt-6 space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Long-term capital gains brackets are used for <strong>estimation only</strong>. They do not substitute a CPA or official tax software.
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Long-term Capital Gains Brackets</h2>
            <Dialog open={taxOpen} onOpenChange={setTaxOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setEditingTax(null); taxForm.reset({ tax_year: new Date().getFullYear() }); }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Year
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingTax ? 'Edit Tax Setting' : 'Add Tax Setting'}</DialogTitle></DialogHeader>
                <form onSubmit={taxForm.handleSubmit(onSubmitTax)} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tax Year *</Label>
                      <Input type="number" {...taxForm.register('tax_year', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Filing Status *</Label>
                      <Select onValueChange={(v) => taxForm.setValue('filing_status', v as any)} defaultValue={editingTax?.filing_status ?? 'single'}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(FILING_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>0% Bracket Limit ($)</Label>
                      <Input type="number" {...taxForm.register('zero_percent_limit', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>15% Bracket Limit ($)</Label>
                      <Input type="number" {...taxForm.register('fifteen_percent_limit', { valueAsNumber: true })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setTaxOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={taxForm.formState.isSubmitting}>Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Filing Status</TableHead>
                  <TableHead className="text-right">0% up to</TableHead>
                  <TableHead className="text-right">15% up to</TableHead>
                  <TableHead className="text-right">20% above</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxSettings.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.tax_year}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{FILING_STATUS_LABELS[t.filing_status]}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${t.zero_percent_limit.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm">${t.fifteen_percent_limit.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">>${t.fifteen_percent_limit.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium">{profile?.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <p className="font-medium">{profile?.full_name ?? '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Member Since</Label>
                <p className="font-medium">{profile?.created_at?.slice(0, 10)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
