'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, BarChart3, Search, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { assetFormSchema, AssetFormValues } from '@/lib/validators/transaction';
import { Asset, AssetType } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const assetTypeColors: Record<AssetType, string> = {
  stock: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  etf: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  crypto: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export function AssetsClient({ initialAssets }: { initialAssets: Asset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);
  const [mergeTarget, setMergeTarget] = useState<{ source: Asset; target: Asset } | null>(null);
  const [merging, setMerging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/prices/update', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (data.updated > 0) {
          toast({ title: `Prices updated`, description: `${data.updated} asset${data.updated !== 1 ? 's' : ''} refreshed. Reloading...` });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          const errMsg = data.errors?.[0] ?? 'No prices returned. Yahoo Finance may be temporarily unavailable.';
          toast({ title: 'No prices updated', description: errMsg, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Error', description: data.error ?? 'Failed to update prices', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not reach the server', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: { is_active: true },
  });

  const assetType = watch('asset_type');
  const isActive = watch('is_active');

  const filtered = assets.filter(
    (a) => a.ticker.toLowerCase().includes(search.toLowerCase()) ||
      (a.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    reset({ ticker: '', name: '', asset_type: 'stock', price_source: undefined, is_active: true });
    setOpen(true);
  };

  const openEdit = (a: Asset) => {
    setEditing(a);
    reset({ ticker: a.ticker, name: a.name ?? '', asset_type: a.asset_type, price_source: a.price_source ?? undefined, is_active: a.is_active });
    setOpen(true);
  };

  const onSubmit = async (values: AssetFormValues) => {
    const supabase = createClient();
    const price_source = values.price_source ?? (values.asset_type === 'crypto' ? 'coingecko' : 'manual');
    const newTicker = values.ticker.toUpperCase().trim();

    if (editing) {
      // Check if the new ticker conflicts with an existing asset (different id)
      const conflict = assets.find((a) => a.ticker.toUpperCase() === newTicker && a.id !== editing.id);
      if (conflict) {
        // Offer to merge instead of showing a cryptic DB error
        setMergeTarget({ source: editing, target: conflict });
        setOpen(false);
        return;
      }
      const { error } = await supabase.from('assets').update({ ...values, ticker: newTicker, price_source }).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setAssets(assets.map((a) => a.id === editing.id ? { ...a, ...values, ticker: newTicker, price_source } : a));
      toast({ title: 'Asset updated' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('assets').insert({ user_id: user!.id, ...values, ticker: newTicker, price_source }).select().single();
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setAssets([...assets, data].sort((a, b) => a.ticker.localeCompare(b.ticker)));
      toast({ title: 'Asset created' });
    }
    setOpen(false);
  };

  const onMerge = async () => {
    if (!mergeTarget) return;
    setMerging(true);
    try {
      const res = await fetch('/api/assets/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_asset_id: mergeTarget.source.id, target_asset_id: mergeTarget.target.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Merge failed', description: data.error, variant: 'destructive' }); return; }
      // Remove source asset from list
      setAssets(assets.filter((a) => a.id !== mergeTarget.source.id));
      setMergeTarget(null);
      toast({ title: 'Assets merged', description: `All transactions from ${mergeTarget.source.ticker} moved to ${mergeTarget.target.ticker}.` });
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setMerging(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    const supabase = createClient();
    const { error } = await supabase.from('assets').delete().eq('id', deleting.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setAssets(assets.filter((a) => a.id !== deleting.id));
    setDeleting(null);
    toast({ title: 'Asset deleted' });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search ticker or name..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground ml-auto">{filtered.length} asset{filtered.length !== 1 ? 's' : ''}</p>
        <Button variant="outline" size="sm" onClick={handleRefreshPrices} disabled={refreshing}>
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh Prices'}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Asset</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Asset' : 'Add Asset'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ticker *</Label>
                  <Input placeholder="AAPL" className="uppercase" {...register('ticker')} />
                  {errors.ticker && <p className="text-sm text-destructive">{errors.ticker.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select onValueChange={(v) => {
                    setValue('asset_type', v as AssetType);
                    if (v === 'crypto') setValue('price_source', 'coingecko');
                    else setValue('price_source', 'manual');
                  }} defaultValue={editing?.asset_type ?? 'stock'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="etf">ETF</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g. Apple Inc." {...register('name')} />
              </div>
              <div className="space-y-2">
                <Label>Price Source</Label>
                <Select onValueChange={(v) => setValue('price_source', v as any)} defaultValue={editing?.price_source ?? (assetType === 'crypto' ? 'coingecko' : 'manual')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Yahoo Finance (Free)</SelectItem>
                    <SelectItem value="alphavantage">Alpha Vantage</SelectItem>
                    <SelectItem value="twelvedata">Twelve Data</SelectItem>
                    <SelectItem value="coingecko">CoinGecko (Crypto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={(v) => setValue('is_active', v)} id="asset_active" />
                <Label htmlFor="asset_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No assets yet</p>
            <p className="text-sm text-muted-foreground">Add your first stock, ETF or crypto.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price Source</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((asset) => (
                <TableRow key={asset.id} className={cn(!asset.is_active && 'opacity-50')}>
                  <TableCell className="font-mono font-semibold">{asset.ticker}</TableCell>
                  <TableCell className="text-muted-foreground">{asset.name ?? '—'}</TableCell>
                  <TableCell>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', assetTypeColors[asset.asset_type])}>
                      {asset.asset_type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{asset.price_source ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {asset.current_price ? formatCurrency(asset.current_price) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={asset.is_active ? 'default' : 'secondary'} className="text-xs">
                      {asset.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(asset)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(asset)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleting?.ticker}</strong>? Cannot undo if transactions reference it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge dialog: appears when user renames a ticker to one that already exists */}
      <AlertDialog open={!!mergeTarget} onOpenChange={(o) => !o && setMergeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge duplicate assets?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{mergeTarget?.target.ticker}</strong> already exists. Would you like to merge{' '}
                <strong>{mergeTarget?.source.ticker}</strong> into it?
              </span>
              <span className="block text-sm">
                All transactions, tax lots and realized gains from <strong>{mergeTarget?.source.ticker}</strong> will be
                reassigned to <strong>{mergeTarget?.target.ticker}</strong>, and <strong>{mergeTarget?.source.ticker}</strong> will
                be deleted. This cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onMerge} disabled={merging}>
              {merging ? 'Merging...' : `Merge into ${mergeTarget?.target.ticker}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
