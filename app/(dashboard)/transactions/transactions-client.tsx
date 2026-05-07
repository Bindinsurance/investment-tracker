'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, Trash2, Pencil } from 'lucide-react';
import { Transaction, Account, Asset } from '@/types';
import { formatCurrency, formatDate, formatQuantity, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  initialTransactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
}

const TYPE_COLORS: Record<string, string> = {
  buy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  sell: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  dividend: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  fee: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function TransactionsClient({ initialTransactions, accounts, assets }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<{ transaction_date: string; quantity: string; unit_price: string; total_amount: string; fee: string; notes: string }>({ transaction_date: '', quantity: '', unit_price: '', total_amount: '', fee: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const filtered = transactions.filter((t) => {
    const matchSearch =
      (t.asset?.ticker ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.account?.nickname ?? '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || t.transaction_type === typeFilter;
    const matchAccount = accountFilter === 'all' || t.account_id === accountFilter;
    const matchFrom = !dateFrom || t.transaction_date >= dateFrom;
    const matchTo = !dateTo || t.transaction_date <= dateTo;
    return matchSearch && matchType && matchAccount && matchFrom && matchTo;
  });

  // Totals for the filtered set
  const totalAmount = filtered.reduce((sum, t) => sum + (t.total_amount ?? 0), 0);
  const showTotal = typeFilter !== 'all' || dateFrom || dateTo;

  const onDelete = async () => {
    if (!deleting) return;
    const supabase = createClient();
    const { error } = await supabase.from('transactions').delete().eq('id', deleting.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setTransactions(transactions.filter((t) => t.id !== deleting.id));
    setDeleting(null);
    toast({ title: 'Transaction deleted', description: 'Note: Tax lots/realized gains may need recalculation.' });
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setEditForm({
      transaction_date: tx.transaction_date,
      quantity: tx.quantity?.toString() ?? '0',
      unit_price: tx.unit_price?.toString() ?? '0',
      total_amount: tx.total_amount?.toString() ?? '0',
      fee: tx.fee?.toString() ?? '0',
      notes: tx.notes ?? '',
    });
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const updates = {
        transaction_date: editForm.transaction_date,
        quantity: parseFloat(editForm.quantity) || 0,
        unit_price: parseFloat(editForm.unit_price) || 0,
        total_amount: parseFloat(editForm.total_amount) || 0,
        fee: parseFloat(editForm.fee) || 0,
        notes: editForm.notes || null,
      };
      const { error } = await supabase.from('transactions').update(updates).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setTransactions(transactions.map((t) => t.id === editing.id ? { ...t, ...updates } : t));
      setEditing(null);
      toast({ title: 'Transaction updated', description: 'Note: Tax lots are not recalculated automatically.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search ticker or account..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
            <SelectItem value="dividend">Dividend</SelectItem>
            <SelectItem value="fee">Fee</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>)}
          </SelectContent>
        </Select>
        {/* Period filter */}
        <Input type="date" className="w-36 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
        <span className="text-muted-foreground text-sm">–</span>
        <Input type="date" className="w-36 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
        <p className="text-sm text-muted-foreground ml-auto">{filtered.length} records</p>
        <Link href="/transactions/buy">
          <Button size="sm" variant="outline">
            <ArrowDownCircle className="w-4 h-4 mr-2 text-emerald-500" /> Buy
          </Button>
        </Link>
        <Link href="/transactions/sell">
          <Button size="sm">
            <ArrowUpCircle className="w-4 h-4 mr-2 text-red-400" /> Sell
          </Button>
        </Link>
      </div>

      {/* Total bar — shown when any filter is active */}
      {showTotal && filtered.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border text-sm">
          <span className="text-muted-foreground">
            {typeFilter !== 'all' ? typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1) : 'Filtered'} total
            {dateFrom || dateTo ? ` (${dateFrom || '…'} → ${dateTo || '…'})` : ''}:
          </span>
          <span className="font-semibold text-base">{formatCurrency(totalAmount)}</span>
          <span className="text-muted-foreground text-xs">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <p className="font-medium text-muted-foreground">No transactions found</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">{formatDate(tx.transaction_date)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('text-xs', TYPE_COLORS[tx.transaction_type] ?? '')}>
                      {tx.transaction_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{tx.asset?.ticker ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{tx.account?.nickname}</div>
                    <div className="text-xs">{tx.account?.broker?.name}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatQuantity(tx.quantity)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(tx.unit_price)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(tx.total_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">{tx.fee ? formatCurrency(tx.fee) : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(tx)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(tx)}>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {deleting?.transaction_type.toUpperCase()} of {deleting?.asset?.ticker} on {formatDate(deleting?.transaction_date ?? '')}. Tax lots and realized gains will NOT be automatically recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Transaction — {editing?.transaction_type?.toUpperCase()} {editing?.asset?.ticker}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={editForm.transaction_date} onChange={(e) => setEditForm({ ...editForm, transaction_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" step="any" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Price ($)</Label>
                <Input type="number" step="any" value={editForm.unit_price} onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Amount ($)</Label>
                <Input type="number" step="any" value={editForm.total_amount} onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fee ($)</Label>
                <Input type="number" step="any" value={editForm.fee} onChange={(e) => setEditForm({ ...editForm, fee: e.target.value })} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional notes..." />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">⚠️ Tax lots and FIFO calculations are not updated automatically after editing.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={onSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
