'use client';

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, RefreshCw,
  BarChart3, Wallet, Building2, Clock
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PortfolioSummary } from '@/types';
import { formatCurrency, formatPercent, formatDate, cn } from '@/lib/utils';
import { toAllocationItems, formatQuantity } from '@/lib/calculations/portfolio';
import { useToast } from '@/hooks/use-toast';

interface Props {
  summary: PortfolioSummary;
  snapshots: Array<{ snapshot_date: string; total_value: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

function StatCard({
  title, value, subtitle, icon: Icon, trend, className
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral'; className?: string;
}) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-profit',
                trend === 'down' && 'text-loss',
                trend === 'neutral' && 'text-muted-foreground',
              )}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn(
            'rounded-lg p-2',
            trend === 'up' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
            trend === 'down' && 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
            (!trend || trend === 'neutral') && 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AllocationChart({ title, data }: { title: string; data: ReturnType<typeof toAllocationItems> }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No data yet
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ summary, snapshots }: Props) {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdatePrices = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/api/prices/update', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Prices updated', description: `Updated ${data.updated} assets.` });
        window.location.reload();
      } else {
        toast({ title: 'Error', description: data.error ?? 'Failed to update prices', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const unrealizedTrend = summary.total_unrealized_gain_loss > 0 ? 'up' : summary.total_unrealized_gain_loss < 0 ? 'down' : 'neutral';
  const realizedTrend = summary.realized_gain_loss_ytd > 0 ? 'up' : summary.realized_gain_loss_ytd < 0 ? 'down' : 'neutral';

  const brokerAllocation = toAllocationItems(summary.by_broker);
  const accountTypeAllocation = toAllocationItems(summary.by_account_type);
  const assetTypeAllocation = toAllocationItems(summary.by_asset_type);

  const chartData = snapshots.map((s) => ({
    date: format(parseISO(s.snapshot_date), 'MMM d'),
    value: s.total_value,
  }));

  const allPositions = summary.positions;

  return (
    <div className="p-6 space-y-6">
      {/* Update prices bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {summary.last_price_update
            ? `Prices updated ${formatDate(summary.last_price_update)}`
            : 'Prices not yet updated'}
        </div>
        <Button variant="outline" size="sm" onClick={handleUpdatePrices} disabled={updating}>
          <RefreshCw className={cn('w-4 h-4 mr-2', updating && 'animate-spin')} />
          {updating ? 'Updating...' : 'Update Prices'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Portfolio Value"
          value={formatCurrency(summary.total_value)}
          subtitle="Current market value"
          icon={DollarSign}
        />
        <StatCard
          title="Cost Basis"
          value={formatCurrency(summary.total_cost_basis)}
          subtitle="Total invested"
          icon={Wallet}
          trend="neutral"
        />
        <StatCard
          title="Unrealized P&L"
          value={formatCurrency(summary.total_unrealized_gain_loss)}
          subtitle={formatPercent(summary.total_unrealized_gain_loss_pct)}
          icon={unrealizedTrend === 'up' ? TrendingUp : TrendingDown}
          trend={unrealizedTrend}
        />
        <StatCard
          title="Realized P&L (All-time)"
          value={formatCurrency(summary.realized_gain_loss_ytd)}
          subtitle="Historical total"
          icon={realizedTrend === 'up' ? TrendingUp : TrendingDown}
          trend={realizedTrend}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AllocationChart title="By Broker" data={brokerAllocation} />
        <AllocationChart title="By Account Type" data={accountTypeAllocation} />
        <AllocationChart title="By Asset Type" data={assetTypeAllocation} />
      </div>

      {/* Portfolio chart — full width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Not enough data for chart yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Value']} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#portfolioGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* All Positions — full width table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Positions</CardTitle>
          <CardDescription>{allPositions.length} position{allPositions.length !== 1 ? 's' : ''} · sorted by value</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {allPositions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No positions yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ticker</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Account</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Avg Cost</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Price</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Value</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">P&amp;L</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">% Port.</th>
                  </tr>
                </thead>
                <tbody>
                  {allPositions.map((pos) => (
                    <tr key={`${pos.account.id}-${pos.asset.id}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {pos.asset.ticker.slice(0, 3)}
                          </div>
                          <span className="font-medium">{pos.asset.ticker}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{pos.account.nickname}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{formatQuantity(pos.quantity)}</td>
                      <td className="px-4 py-2.5 text-right text-xs">{formatCurrency(pos.avg_cost_basis)}</td>
                      <td className="px-4 py-2.5 text-right text-xs">{formatCurrency(pos.current_price)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(pos.current_value)}</td>
                      <td className={cn('px-4 py-2.5 text-right', pos.unrealized_gain_loss >= 0 ? 'text-profit' : 'text-loss')}>
                        <div className="font-medium">{formatCurrency(pos.unrealized_gain_loss)}</div>
                        <div className="text-xs">{formatPercent(pos.unrealized_gain_loss_pct)}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {summary.total_value > 0 ? ((pos.current_value / summary.total_value) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
