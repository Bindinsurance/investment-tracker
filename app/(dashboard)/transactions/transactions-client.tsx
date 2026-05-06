'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { Transaction, Account, Asset } from '@/types';
import { formatCurrency, formatDate, formatQuantity, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  initialTransactions: Transaction[];
  accounts: Account[];
  assets: Asset[];
}

export function TransactionsClient({ initialTransactions, accounts, assets }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const filtered = transactions.filter((t) => {
    const matchSearch =
      (t.asset?.ticker ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.account?.nickname ?? '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || t.transaction_type === typeFilter;
    const matchAccount = accountFilter === 'all' || t.account_id === accountFilter;
    return matchSearch && matchType && matchAccount;
  });

  const onDelete = async () => {
    if (!deleting) return;
    const supabase = createClient();
    const { error } = await supabase.from('transactions').delete().eq('id', deleting.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setTransactions(transactions.filter((t) => t.id !== deleting.id));
    setDeleting(null);
    toast({ title: 'Transaction deleted', description: 'Note: Tax lots/realized gains may need recalculation.' });
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
          <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
            <SelectItem value="dividend">Dividend</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.nickname}</SelectItem>)}
          </SelectContent>
        </Select>
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
                    <Badge variant="secondary"
                      className={cn('text-xs',
                        tx.transaction_type === 'buy'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : tx.transaction_type === 'sell'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      )}>
                      {tx.transaction_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{tx.asset?.ticker}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{tx.account?.nickname}</div>
                    <div className="text-xs">{tx.account?.broker?.name}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatQuantity(tx.quantity)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(tx.unit_price)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(tx.total_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">{tx.fee ? formatCurrency(tx.fee) : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(tx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
    </div>
  );
}
