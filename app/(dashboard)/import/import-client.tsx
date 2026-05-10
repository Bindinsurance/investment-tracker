'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { Account, Asset, ParsedTransaction, CsvColumnMapping } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ExistingTransaction {
  transaction_date: string;
  transaction_type: string;
  quantity: number;
  unit_price: number;
  asset: { ticker: string } | null;
}

interface Props {
  accounts: Account[];
  existingAssets: Asset[];
  existingTransactions: ExistingTransaction[];
}

const STEPS = ['Upload', 'Map Columns', 'Preview & Confirm', 'Done'] as const;
type Step = typeof STEPS[number];

function parseDate(raw: string): string {
  if (!raw) return '';
  // Try common formats
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // MM/DD/YYYY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return raw;
}

function parseAction(raw: string): 'buy' | 'sell' | 'dividend' | 'fee' | null {
  const lower = raw.toLowerCase().trim();
  // SKIP: internal cash sweeps — Fidelity money market redemptions (FDRXX/SPAXX)
  // These are not real investment transactions, just cash movements within the account
  if (lower.includes('redemption from core account')) return null;
  // FEE: must check before dividend/buy to avoid misclassifying
  // Fix #2: add foreign tax paid (e.g. Petrobras ADR withholding tax)
  if (lower.includes('fee charged') || lower.includes('service fee') || lower.includes('advisory fee') ||
      lower.includes('account fee') || lower.includes('margin interest') || lower.includes('expense ratio') ||
      lower.includes('management fee') || lower === 'fee' ||
      lower.includes('foreign tax paid') || lower.includes('adj foreign tax paid')) return 'fee';
  // DIVIDEND: includes received/cash dividends and capital gain distributions
  if ((lower.includes('dividend') && !lower.includes('reinvestment') && !lower.includes('reinvest')) ||
      lower.includes('div reinv') || lower.includes('qualified div') || lower.includes('capital gain') ||
      lower.includes('income distribution') || lower.includes('interest earned') ||
      lower.includes('interest credit') || lower.includes('ordinary dividend')) return 'dividend';
  // REINVESTMENT = dividend automatically reinvested as a buy (DRIP)
  if (lower.includes('reinvestment') || lower.includes('reinvest')) return 'buy';
  // BUY variants: standard brokerage + 401K (contribution, exchange in, transfer in, rollover)
  if (lower.includes('buy') || lower.includes('purchase') || lower.includes('bought') ||
      lower.includes('you bought') || lower.includes('transfer in') || lower.includes('transferred in') ||
      lower.includes('exchange in') || lower.includes('contribution') || lower.includes('employer match') ||
      lower.includes('rollover in') || lower.includes('deposit') && lower.includes('securit')) return 'buy';
  // SELL variants: standard brokerage + 401K (exchange out, transfer out, withdrawal)
  // Fix #3: removed 'distribution' — Fidelity uses "DISTRIBUTION [TICKER] (Shares)" for stock splits
  // which are NOT sells. Cash distributions are already caught above by the dividend rule.
  if (lower.includes('sell') || lower.includes('sold') || lower.includes('you sold') ||
      lower.includes('transfer out') || lower.includes('transferred out') ||
      lower.includes('exchange out') || lower.includes('rollover out') ||
      lower.includes('withdrawal')) return 'sell';
  return null;
}

export function ImportClient({ accounts, existingAssets, existingTransactions }: Props) {
  const [step, setStep] = useState<Step>('Upload');
  const [accountId, setAccountId] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Partial<CsvColumnMapping>>({});
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { toast({ title: 'Invalid file', description: 'Please upload a .csv file', variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' }); return; }
    setFileName(file.name);
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (result) => {
          try {
            const headers = (result.meta.fields ?? []).filter(h => h && h.trim() !== '');
            if (headers.length === 0) {
              toast({ title: 'Empty or invalid CSV', description: 'No column headers found in the file.', variant: 'destructive' });
              return;
            }
            const rows = (result.data as Record<string, string>[]).filter(row => {
              const vals = Object.values(row);
              return vals.some(v => v && v.toString().trim() !== '');
            });
            setCsvHeaders(headers);
            setCsvRows(rows);
            // Auto-map common column names
            const autoMap: Partial<CsvColumnMapping> = {};
            const lower = headers.map((h) => h.toLowerCase());
            const find = (terms: string[]) => {
              const idx = lower.findIndex((h) => terms.some((t) => h.includes(t)));
              return idx >= 0 ? headers[idx] : '';
            };
            autoMap.date = find(['date', 'trade date', 'settlement']);
            autoMap.action = find(['action', 'type', 'transaction', 'description']);
            autoMap.symbol = find(['symbol', 'ticker', 'asset', 'cusip']);
            autoMap.quantity = find(['qty', 'quantity', 'shares', 'units']);
            autoMap.price = find(['price', 'unit price']);
            autoMap.amount = find(['amount', 'total', 'value', 'net amount']);
            autoMap.fee = find(['fee', 'commission', 'cost']);
            setMapping(autoMap);
            setStep('Map Columns');
          } catch (err) {
            console.error('CSV processing error:', err);
            toast({ title: 'Error reading file', description: 'Could not process the CSV. Make sure it is a transaction history export, not a statement or portfolio summary.', variant: 'destructive' });
          }
        },
        error: (err) => {
          console.error('PapaParse error:', err);
          toast({ title: 'Parse error', description: 'Could not parse the CSV file.', variant: 'destructive' });
        },
      });
    } catch (err) {
      console.error('File read error:', err);
      toast({ title: 'File error', description: 'Could not read the file.', variant: 'destructive' });
    }
  }, [toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const buildPreview = () => {
    try {
      const rows: ParsedTransaction[] = csvRows.slice(0, 500).map((row) => {
        const safeStr = (val: unknown) => String(val ?? '').trim();
        const safeNum = (val: unknown) => parseFloat(safeStr(val).replace(/[$,\s]/g, '')) || 0;
        const date = parseDate(safeStr(row[mapping.date ?? '']));
        const action = parseAction(safeStr(row[mapping.action ?? '']));
        const ticker = safeStr(row[mapping.symbol ?? '']).toUpperCase();
        // Fidelity exports negative quantities for sells and negative amounts for buys — normalize with Math.abs
        const quantity = Math.abs(safeNum(row[mapping.quantity ?? '']));
        const price = Math.abs(safeNum(row[mapping.price ?? '']));
        const amount = Math.abs(safeNum(row[mapping.amount ?? '']));
        const fee = Math.abs(safeNum(row[mapping.fee ?? '']));
        const totalAmount = amount || quantity * price;
        const actualQty = quantity || (price > 0 ? totalAmount / price : 0);
        const isDividend = action === 'dividend';
        const isFee = action === 'fee';
        const error = !date ? 'Invalid date' : !action ? 'Unknown action'
          : (!ticker && !isFee) ? 'No ticker'
          : (!isDividend && !isFee && actualQty <= 0) ? 'Invalid qty'
          : (!isDividend && !isFee && price <= 0) ? 'Invalid price'
          : ((isDividend || isFee) && totalAmount <= 0) ? (isFee ? 'Invalid fee amount' : 'Invalid dividend amount')
          : undefined;

        // Check for duplicates against existing transactions (tolerance 0.01%)
        const isDuplicate = !error && existingTransactions.some((t) => {
          if (t.asset?.ticker !== ticker) return false;
          if (t.transaction_date !== date) return false;
          if (t.transaction_type !== (action ?? 'buy')) return false;
          const qtyMatch = Math.abs(t.quantity - actualQty) < Math.max(0.0001, actualQty * 0.0001);
          const priceMatch = isDividend || Math.abs(t.unit_price - price) < Math.max(0.01, price * 0.0001);
          return qtyMatch && priceMatch;
        });

        return {
          transaction_date: date,
          transaction_type: action ?? 'buy',
          ticker,
          quantity: isFinite(actualQty) ? actualQty : 0,
          unit_price: isFinite(price) ? price : 0,
          total_amount: isFinite(totalAmount) ? totalAmount : 0,
          fee: isFinite(fee) ? fee : 0,
          raw: row,
          error,
          isDuplicate,
        };
      });
      setParsed(rows);
      setStep('Preview & Confirm');
    } catch (err) {
      console.error('Preview build error:', err);
      toast({ title: 'Error building preview', description: 'Could not process the CSV rows. Please check the column mapping.', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    const valid = parsed.filter((r) => !r.error && !r.isDuplicate);
    if (valid.length === 0) { toast({ title: 'Nothing to import', description: 'All rows have errors or are duplicates.' }); return; }
    if (!accountId) { toast({ title: 'Select an account', variant: 'destructive' }); return; }
    setImporting(true);
    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: valid, account_id: accountId, file_name: fileName }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Import failed', description: data.error, variant: 'destructive' }); return; }
      const dupMsg = data.duplicates > 0 ? ` ${data.duplicates} duplicate${data.duplicates !== 1 ? 's' : ''} skipped.` : '';
      toast({ title: 'Import complete!', description: `Imported ${data.imported} transactions.${dupMsg}` });
      setStep('Done');
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setStep('Upload'); setCsvHeaders([]); setCsvRows([]); setFileName(''); setMapping({}); setParsed([]); setAccountId(''); };
  const validCount = parsed.filter((r) => !r.error && !r.isDuplicate).length;
  const errorCount = parsed.filter((r) => !!r.error).length;
  const duplicateCount = parsed.filter((r) => !r.error && !!r.isDuplicate).length;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              step === s ? 'bg-primary text-primary-foreground' :
              STEPS.indexOf(step) > i ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
              {STEPS.indexOf(step) > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('text-sm hidden sm:inline', step === s ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'Upload' && (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Required: Transaction History CSV</strong> — not a statement or portfolio summary.
              <br />
              The CSV must have columns for: <strong>Date, Action (Buy/Sell), Symbol, Quantity, Price</strong>.
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                In Fidelity: Accounts → History → select date range → Download (CSV). &nbsp;
                In Schwab: Accounts → History → Export. &nbsp;
                In Robinhood: Account → Statements → CSV.
              </span>
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label>Account *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.nickname} — {a.broker?.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">Drop CSV here or click to browse</p>
            <p className="text-sm text-muted-foreground">Max 5MB — transaction history format</p>
            <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 'Map Columns' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Map CSV Columns</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['date', 'Date *'],
                  ['action', 'Action/Type *'],
                  ['symbol', 'Symbol/Ticker *'],
                  ['quantity', 'Quantity'],
                  ['price', 'Unit Price *'],
                  ['amount', 'Total Amount'],
                  ['fee', 'Fee/Commission'],
                ] as [keyof CsvColumnMapping, string][]).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Select value={mapping[key] ?? '__skip__'} onValueChange={(v) => setMapping({ ...mapping, [key]: v === '__skip__' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="— skip —" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">— skip —</SelectItem>
                        {csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep('Upload')}>Back</Button>
                <Button onClick={buildPreview}>Preview →</Button>
              </div>
            </CardContent>
          </Card>
          {/* Sample preview */}
          {csvRows.length > 0 && (
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>{csvHeaders.slice(0, 8).map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {csvRows.slice(0, 3).map((r, i) => (
                    <TableRow key={i}>{csvHeaders.slice(0, 8).map((h) => <TableCell key={h} className="text-xs">{r[h]}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'Preview & Confirm' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Badge variant="default">{validCount} to import</Badge>
            {duplicateCount > 0 && <Badge variant="outline" className="text-amber-600 border-amber-400">{duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} (will skip)</Badge>}
            {errorCount > 0 && <Badge variant="destructive">{errorCount} invalid (will skip)</Badge>}
          </div>
          {errorCount > 0 && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>Rows with errors or duplicates will be skipped automatically.</AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto rounded border max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Ticker</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Price</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((r, i) => (
                  <TableRow key={i} className={cn(r.error && 'bg-destructive/5', r.isDuplicate && 'bg-amber-50 dark:bg-amber-950/20')}>
                    <TableCell>
                      {r.error ? <Badge variant="destructive" className="text-xs">{r.error}</Badge>
                        : r.isDuplicate ? <Badge variant="outline" className="text-xs text-amber-600">Duplicate</Badge>
                        : <Badge variant="secondary" className="text-xs text-emerald-600">OK</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{r.transaction_date}</TableCell>
                    <TableCell><Badge variant="secondary" className={cn('text-xs',
                      r.transaction_type === 'buy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                      r.transaction_type === 'sell' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      r.transaction_type === 'dividend' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      r.transaction_type === 'fee' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' : ''
                    )}>{r.transaction_type.toUpperCase()}</Badge></TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{r.ticker}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{r.quantity.toFixed(4)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(r.unit_price)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(r.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('Map Columns')}>Back</Button>
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? 'Importing...' : `Import ${validCount} transactions`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'Done' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          <h2 className="text-xl font-semibold">Import Complete!</h2>
          <p className="text-muted-foreground">Your transactions have been imported. FIFO lots were created automatically.</p>
          <Button onClick={reset}>Import Another File</Button>
        </div>
      )}
    </div>
  );
}
