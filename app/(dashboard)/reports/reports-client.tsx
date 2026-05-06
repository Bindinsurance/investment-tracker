'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { FileText, Download, Calendar, AlertCircle } from 'lucide-react';
import { Account, Broker, TaxRateSetting, RealizedGain, Transaction } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface Props {
  accounts: Account[];
  brokers: Broker[];
  taxSettings: TaxRateSetting[];
}

type ReportType = 'daily' | 'monthly' | 'annual' | 'tax';

interface ReportData {
  realized_gains: any[];
  transactions: any[];
  summary: {
    total_proceeds: number;
    total_cost_basis: number;
    total_gain_loss: number;
    short_term_gain_loss: number;
    long_term_gain_loss: number;
    buy_count: number;
    sell_count: number;
    total_invested: number;
  };
}

function fmt(v: number) { return formatCurrency(v); }
function termBadge(term: string) {
  return (
    <Badge variant="outline" className={cn('text-xs', term === 'long_term'
      ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400'
      : 'border-amber-300 text-amber-700 dark:text-amber-400')}>
      {term === 'long_term' ? 'Long-term' : 'Short-term'}
    </Badge>
  );
}

export function ReportsClient({ accounts, brokers, taxSettings }: Props) {
  const today = new Date();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [taxableOnly, setTaxableOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const { toast } = useToast();

  const setPreset = (type: ReportType) => {
    setReportType(type);
    if (type === 'daily') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (type === 'monthly') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    } else if (type === 'annual' || type === 'tax') {
      setStartDate(format(startOfYear(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfYear(today), 'yyyy-MM-dd'));
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate, taxable_only: taxableOnly.toString() });
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      setReportData(data);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;
    const rows = reportData.realized_gains.map((g: any) => ([
      g.sale_date, g.acquisition_date, g.ticker, g.account_nickname,
      g.broker_name, g.quantity_sold, g.proceeds, g.cost_basis, g.gain_loss, g.term,
    ]));
    const header = ['Sale Date', 'Acquisition Date', 'Ticker', 'Account', 'Broker', 'Qty Sold', 'Proceeds', 'Cost Basis', 'Gain/Loss', 'Term'];
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investment-report-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!reportData) return;
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Investment Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 28);
      doc.text(`Total Gain/Loss: ${fmt(reportData.summary.total_gain_loss)}`, 14, 34);

      autoTable(doc, {
        head: [['Sale Date', 'Acq Date', 'Ticker', 'Account', 'Qty', 'Proceeds', 'Cost Basis', 'Gain/Loss', 'Term']],
        body: reportData.realized_gains.map((g: any) => [
          g.sale_date, g.acquisition_date, g.ticker, g.account_nickname,
          g.quantity_sold.toFixed(4), fmt(g.proceeds), fmt(g.cost_basis), fmt(g.gain_loss),
          g.term === 'long_term' ? 'Long-term' : 'Short-term',
        ]),
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
      doc.save(`investment-report-${startDate}-${endDate}.pdf`);
    } catch {
      toast({ title: 'PDF export failed', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Controls */}
      <Card>
        <CardHeader><CardTitle className="text-base">Report Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['daily', 'monthly', 'annual', 'tax'] as ReportType[]).map((t) => (
              <Button key={t} variant={reportType === t ? 'default' : 'outline'} size="sm" onClick={() => setPreset(t)} className="capitalize">
                {t === 'tax' ? 'Tax (Annual)' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={taxableOnly} onCheckedChange={setTaxableOnly} id="taxable_only" />
              <Label htmlFor="taxable_only" className="text-sm">Taxable accounts only</Label>
            </div>
            <Button onClick={generateReport} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {reportData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Proceeds', value: fmt(reportData.summary.total_proceeds) },
              { label: 'Total Cost Basis', value: fmt(reportData.summary.total_cost_basis) },
              { label: 'Net Gain/Loss', value: fmt(reportData.summary.total_gain_loss), colored: true },
              { label: 'Short-term G/L', value: fmt(reportData.summary.short_term_gain_loss), colored: true },
              { label: 'Long-term G/L', value: fmt(reportData.summary.long_term_gain_loss), colored: true },
              { label: 'Buys / Sells', value: `${reportData.summary.buy_count} / ${reportData.summary.sell_count}` },
            ].map(({ label, value, colored }) => (
              <Card key={label}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('text-sm font-semibold mt-1', colored && (parseFloat(value.replace(/[^0-9.-]/g, '')) >= 0 ? 'text-profit' : 'text-loss'))}>
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPDF}><FileText className="w-4 h-4 mr-2" /> Export PDF</Button>
          </div>

          {(reportType === 'tax' || reportType === 'annual') && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                This report is for personal reference only. Consult a CPA or tax professional for official filings. It does not substitute Form 8949 or Schedule D.
              </AlertDescription>
            </Alert>
          )}

          {/* Realized gains table */}
          {reportData.realized_gains.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Sale Date</TableHead>
                    <TableHead className="text-xs">Acq Date</TableHead>
                    <TableHead className="text-xs">Ticker</TableHead>
                    <TableHead className="text-xs">Account</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Proceeds</TableHead>
                    <TableHead className="text-xs text-right">Cost Basis</TableHead>
                    <TableHead className="text-xs text-right">Gain/Loss</TableHead>
                    <TableHead className="text-xs">Term</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.realized_gains.map((g: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{g.sale_date}</TableCell>
                      <TableCell className="text-xs">{g.acquisition_date}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{g.ticker}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{g.account_nickname}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{g.quantity_sold?.toFixed(4)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(g.proceeds)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(g.cost_basis)}</TableCell>
                      <TableCell className={cn('text-xs text-right font-mono font-semibold', g.gain_loss >= 0 ? 'text-profit' : 'text-loss')}>
                        {fmt(g.gain_loss)}
                      </TableCell>
                      <TableCell>{termBadge(g.term)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {reportData.realized_gains.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No realized gains/losses in this period.
            </div>
          )}
        </>
      )}
    </div>
  );
}
