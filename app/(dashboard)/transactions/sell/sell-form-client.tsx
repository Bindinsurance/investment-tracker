'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import { sellFormSchema, SellFormValues } from '@/lib/validators/transaction';
import { calculateSellQuantityFromAmount } from '@/lib/calculations/fifo';
import { Account, Asset } from '@/types';
import { formatCurrency, formatQuantity, today } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Props { accounts: Account[]; assets: Asset[]; }

export function SellFormClient({ accounts, assets }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [inputMode, setInputMode] = useState<'quantity' | 'amount'>('quantity');
  const [calculatedQty, setCalculatedQty] = useState<number | null>(null);
  const [availableQty, setAvailableQty] = useState<number | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SellFormValues>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: { transaction_date: today(), fee: 0, input_mode: 'quantity' },
  });

  const assetId = watch('asset_id');
  const accountId = watch('account_id');
  const totalAmount = watch('total_amount');
  const unitPrice = watch('unit_price');
  const fee = watch('fee');

  // Load available quantity
  useEffect(() => {
    if (!assetId || !accountId) { setAvailableQty(null); return; }
    fetch(`/api/positions?asset_id=${assetId}&account_id=${accountId}`)
      .then((r) => r.json())
      .then((d) => setAvailableQty(d.quantity ?? null))
      .catch(() => setAvailableQty(null));
  }, [assetId, accountId]);

  useEffect(() => {
    setValue('input_mode', inputMode);
    if (inputMode === 'amount' && totalAmount && unitPrice > 0) {
      setCalculatedQty(calculateSellQuantityFromAmount(totalAmount, unitPrice, fee || 0));
    } else {
      setCalculatedQty(null);
    }
  }, [inputMode, totalAmount, unitPrice, fee, setValue]);

  const onSubmit = async (values: SellFormValues) => {
    try {
      const res = await fetch('/api/transactions/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      const ticker = assets.find((a) => a.id === values.asset_id)?.ticker;
      toast({ title: 'Sale recorded!', description: `FIFO lots consumed for ${ticker}.` });
      router.push('/transactions');
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/transactions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to transactions
      </Link>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Transaction Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" {...register('transaction_date')} />
                {errors.transaction_date && <p className="text-sm text-destructive">{errors.transaction_date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Asset *</Label>
                <Select onValueChange={(v) => setValue('asset_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => <SelectItem key={a.id} value={a.id}><span className="font-mono">{a.ticker}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select onValueChange={(v) => setValue('account_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.nickname} — {a.broker?.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {availableQty !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                Available to sell: <strong className="font-mono text-foreground">{formatQuantity(availableQty)}</strong>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sell Details</CardTitle>
            <CardDescription>Enter quantity or total proceeds. FIFO will be applied automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'quantity' | 'amount')}>
              <TabsList>
                <TabsTrigger value="quantity">By Quantity</TabsTrigger>
                <TabsTrigger value="amount">By Amount</TabsTrigger>
              </TabsList>
              <TabsContent value="quantity" className="mt-4">
                <div className="space-y-2">
                  <Label>Quantity to Sell *</Label>
                  <Input type="number" step="0.00000001" min="0" placeholder="5.0"
                    {...register('quantity', { valueAsNumber: true })} />
                  {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
                </div>
              </TabsContent>
              <TabsContent value="amount" className="mt-4">
                <div className="space-y-2">
                  <Label>Total Amount Received ($) *</Label>
                  <Input type="number" step="0.01" min="0" placeholder="1050.00"
                    {...register('total_amount', { valueAsNumber: true })} />
                </div>
                {calculatedQty !== null && (
                  <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-primary/5 text-sm">
                    <Calculator className="w-4 h-4 text-primary" />
                    Calculated qty: <strong className="font-mono">{formatQuantity(calculatedQty)}</strong>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price per Unit ($) *</Label>
                <Input type="number" step="0.0001" min="0" placeholder="210.00"
                  {...register('unit_price', { valueAsNumber: true })} />
                {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Fee ($)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00"
                  {...register('fee', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none sm:min-w-[140px]">
            {isSubmitting ? 'Recording...' : 'Record Sale'}
          </Button>
          <Link href="/transactions"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
