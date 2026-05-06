'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Calculator } from 'lucide-react';
import { buyFormSchema, BuyFormValues } from '@/lib/validators/transaction';
import { calculateQuantityFromAmount } from '@/lib/calculations/fifo';
import { Account, Asset } from '@/types';
import { formatCurrency, formatQuantity, today } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Props { accounts: Account[]; assets: Asset[]; }

export function BuyFormClient({ accounts, assets }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [calculatedQty, setCalculatedQty] = useState<number | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BuyFormValues>({
    resolver: zodResolver(buyFormSchema),
    defaultValues: { transaction_date: today(), fee: 0 },
  });

  const totalAmount = watch('total_amount');
  const unitPrice = watch('unit_price');
  const fee = watch('fee');

  useEffect(() => {
    if (totalAmount > 0 && unitPrice > 0) {
      setCalculatedQty(calculateQuantityFromAmount(totalAmount, unitPrice, fee || 0));
    } else {
      setCalculatedQty(null);
    }
  }, [totalAmount, unitPrice, fee]);

  const onSubmit = async (values: BuyFormValues) => {
    const quantity = calculateQuantityFromAmount(values.total_amount, values.unit_price, values.fee || 0);
    if (quantity <= 0) {
      toast({ title: 'Invalid calculation', description: 'Quantity must be > 0', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('/api/transactions/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, quantity }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Purchase recorded!', description: `${formatQuantity(quantity)} shares/units of ${assets.find(a => a.id === values.asset_id)?.ticker} added.` });
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
          <CardHeader>
            <CardTitle className="text-base">Transaction Details</CardTitle>
          </CardHeader>
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
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-mono">{a.ticker}</span>
                        {a.name && <span className="text-muted-foreground ml-2 text-xs">{a.name}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select onValueChange={(v) => setValue('account_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nickname} — {a.broker?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_id && <p className="text-sm text-destructive">{errors.account_id.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amount & Price</CardTitle>
            <CardDescription>Enter the total amount invested and price per unit. Quantity is calculated automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Amount Invested ($) *</Label>
                <Input type="number" step="0.01" min="0" placeholder="1000.00"
                  {...register('total_amount', { valueAsNumber: true })} />
                {errors.total_amount && <p className="text-sm text-destructive">{errors.total_amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Price per Unit ($) *</Label>
                <Input type="number" step="0.0001" min="0" placeholder="200.00"
                  {...register('unit_price', { valueAsNumber: true })} />
                {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Fee ($)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00"
                  {...register('fee', { valueAsNumber: true })} />
              </div>
            </div>

            {calculatedQty !== null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Calculator className="w-4 h-4 text-primary" />
                <p className="text-sm">
                  Calculated quantity: <strong className="font-mono">{formatQuantity(calculatedQty)}</strong> units
                  {totalAmount > 0 && unitPrice > 0 && (
                    <span className="text-muted-foreground ml-2">
                      = ({formatCurrency(totalAmount)} - {formatCurrency(fee || 0)}) ÷ {formatCurrency(unitPrice)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes about this purchase..." {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none sm:min-w-[140px]">
            {isSubmitting ? 'Recording...' : 'Record Purchase'}
          </Button>
          <Link href="/transactions">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
