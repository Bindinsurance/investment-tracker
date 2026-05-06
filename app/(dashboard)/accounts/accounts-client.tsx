'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { accountFormSchema, AccountFormValues } from '@/lib/validators/transaction';
import { Account, Broker, AccountType } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Props {
  initialAccounts: Account[];
  brokers: Broker[];
  accountTypes: AccountType[];
}

export function AccountsClient({ initialAccounts, brokers, accountTypes }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { is_active: true },
  });

  const isActive = watch('is_active');

  const openCreate = () => {
    setEditing(null);
    reset({ broker_id: '', account_type_id: '', nickname: '', notes: '', is_active: true });
    setOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    reset({ broker_id: a.broker_id, account_type_id: a.account_type_id, nickname: a.nickname, notes: a.notes ?? '', is_active: a.is_active });
    setOpen(true);
  };

  const onSubmit = async (values: AccountFormValues) => {
    const supabase = createClient();
    if (editing) {
      const { error } = await supabase
        .from('accounts')
        .update({ ...values, notes: values.notes || null })
        .eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      const broker = brokers.find((b) => b.id === values.broker_id);
      const account_type = accountTypes.find((t) => t.id === values.account_type_id);
      setAccounts(accounts.map((a) => a.id === editing.id ? { ...a, ...values, broker, account_type } : a));
      toast({ title: 'Account updated' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('accounts')
        .insert({ user_id: user!.id, ...values, notes: values.notes || null })
        .select('*, broker:brokers(*), account_type:account_types(*)')
        .single();
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setAccounts([...accounts, data].sort((a, b) => a.nickname.localeCompare(b.nickname)));
      toast({ title: 'Account created' });
    }
    setOpen(false);
  };

  const onDelete = async () => {
    if (!deleting) return;
    const supabase = createClient();
    const { error } = await supabase.from('accounts').delete().eq('id', deleting.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setAccounts(accounts.filter((a) => a.id !== deleting.id));
    setDeleting(null);
    toast({ title: 'Account deleted' });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Account' : 'Add Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Broker *</Label>
                <Select onValueChange={(v) => setValue('broker_id', v)} defaultValue={editing?.broker_id}>
                  <SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger>
                  <SelectContent>
                    {brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.broker_id && <p className="text-sm text-destructive">{errors.broker_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select onValueChange={(v) => setValue('account_type_id', v)} defaultValue={editing?.account_type_id}>
                  <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} <span className="text-muted-foreground">({t.tax_treatment === 'taxable' ? 'Taxable' : 'Tax-advantaged'})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account_type_id && <p className="text-sm text-destructive">{errors.account_type_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nickname *</Label>
                <Input placeholder="e.g. Fidelity Brokerage" {...register('nickname')} />
                {errors.nickname && <p className="text-sm text-destructive">{errors.nickname.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Optional..." {...register('notes')} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={(v) => setValue('is_active', v)} id="is_active" />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No accounts yet</p>
            <p className="text-sm text-muted-foreground">Create brokers and account types first, then add accounts.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className={cn(!account.is_active && 'opacity-60')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{account.nickname}</p>
                      <p className="text-xs text-muted-foreground">{account.broker?.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(account)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={account.account_type?.tax_treatment === 'taxable' ? 'default' : 'secondary'} className="text-xs">
                    {account.account_type?.name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {account.account_type?.tax_treatment === 'taxable' ? 'Taxable' : 'Tax-advantaged'}
                  </Badge>
                  {!account.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{deleting?.nickname}</strong>. Cannot be undone if transactions exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
