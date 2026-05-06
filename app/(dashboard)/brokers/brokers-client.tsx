'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { brokerFormSchema, BrokerFormValues } from '@/lib/validators/transaction';
import { Broker } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_BROKERS = ['Fidelity', 'Vanguard', 'Coinbase', 'Robinhood', 'Webull'];

export function BrokersClient({ initialBrokers }: { initialBrokers: Broker[] }) {
  const [brokers, setBrokers] = useState(initialBrokers);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Broker | null>(null);
  const [deleting, setDeleting] = useState<Broker | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BrokerFormValues>({
    resolver: zodResolver(brokerFormSchema),
  });

  const openCreate = () => { setEditing(null); reset({ name: '', notes: '' }); setOpen(true); };
  const openEdit = (b: Broker) => { setEditing(b); reset({ name: b.name, notes: b.notes ?? '' }); setOpen(true); };

  const onSubmit = async (values: BrokerFormValues) => {
    const supabase = createClient();
    if (editing) {
      const { data, error } = await supabase
        .from('brokers')
        .update({ name: values.name, notes: values.notes || null })
        .eq('id', editing.id)
        .select()
        .single();
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setBrokers(brokers.map((b) => (b.id === editing.id ? data : b)));
      toast({ title: 'Broker updated' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('brokers')
        .insert({ user_id: user!.id, name: values.name, notes: values.notes || null })
        .select()
        .single();
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setBrokers([...brokers, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Broker created' });
    }
    setOpen(false);
  };

  const onDelete = async () => {
    if (!deleting) return;
    const supabase = createClient();
    const { error } = await supabase.from('brokers').delete().eq('id', deleting.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setBrokers(brokers.filter((b) => b.id !== deleting.id));
    setDeleting(null);
    toast({ title: 'Broker deleted' });
  };

  const seedDefaults = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const existing = new Set(brokers.map((b) => b.name));
    const toInsert = DEFAULT_BROKERS.filter((n) => !existing.has(n)).map((name) => ({ user_id: user!.id, name }));
    if (toInsert.length === 0) { toast({ title: 'Already set up', description: 'Default brokers already exist.' }); return; }
    const { data, error } = await supabase.from('brokers').insert(toInsert).select();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setBrokers([...brokers, ...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: 'Default brokers added', description: `Added ${toInsert.length} brokers.` });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{brokers.length} broker{brokers.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {brokers.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedDefaults}>Add defaults</Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Add Broker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Broker' : 'Add Broker'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input placeholder="e.g. Fidelity" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Optional notes..." {...register('notes')} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {brokers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No brokers yet</p>
            <p className="text-sm text-muted-foreground">Add your first broker or load the defaults.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brokers.map((broker) => (
            <Card key={broker.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{broker.name}</p>
                      <p className="text-xs text-muted-foreground">Added {formatDate(broker.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(broker)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(broker)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {broker.notes && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{broker.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete broker?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{deleting?.name}</strong>. This cannot be undone and will fail if there are accounts linked to this broker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
