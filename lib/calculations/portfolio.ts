import { TaxLot, Asset, Account, PriceCache, PortfolioPosition, PortfolioSummary, AllocationItem } from '@/types';

export interface PositionInput {
  lot: TaxLot;
  asset: Asset;
  account: Account;
  priceCache: PriceCache | null;
}

/**
 * Aggregates tax lots into portfolio positions.
 */
export function buildPortfolioPositions(inputs: PositionInput[]): PortfolioPosition[] {
  // Group by account + asset
  const grouped = new Map<string, PositionInput[]>();

  for (const input of inputs) {
    if (input.lot.remaining_quantity <= 0) continue;
    const key = `${input.lot.account_id}:${input.lot.asset_id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(input);
  }

  const positions: PortfolioPosition[] = [];

  for (const [, items] of grouped) {
    const { asset, account, priceCache } = items[0];
    // Skip positions with missing joins (can happen if data is incomplete)
    if (!asset || !account) continue;
    const quantity = items.reduce((sum, i) => sum + i.lot.remaining_quantity, 0);
    const costBasisTotal = items.reduce((sum, i) => sum + i.lot.cost_basis_total * (i.lot.remaining_quantity / i.lot.original_quantity), 0);
    const avgCostBasis = quantity > 0 ? costBasisTotal / quantity : 0;
    const currentPrice = priceCache?.current_price ?? 0;
    const currentValue = quantity * currentPrice;
    const unrealizedGainLoss = currentValue - costBasisTotal;
    const unrealizedGainLossPct = costBasisTotal > 0 ? (unrealizedGainLoss / costBasisTotal) * 100 : 0;

    positions.push({
      asset,
      account,
      quantity,
      avg_cost_basis: avgCostBasis,
      current_price: currentPrice,
      current_value: currentValue,
      cost_basis_total: costBasisTotal,
      unrealized_gain_loss: unrealizedGainLoss,
      unrealized_gain_loss_pct: unrealizedGainLossPct,
    });
  }

  return positions.sort((a, b) => b.current_value - a.current_value);
}

/**
 * Builds portfolio summary from positions.
 */
export function buildPortfolioSummary(
  positions: PortfolioPosition[],
  realizedGainLossYtd: number,
  lastPriceUpdate: string | null
): PortfolioSummary {
  const totalValue = positions.reduce((sum, p) => sum + p.current_value, 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.cost_basis_total, 0);
  const totalUnrealized = totalValue - totalCostBasis;
  const totalUnrealizedPct = totalCostBasis > 0 ? (totalUnrealized / totalCostBasis) * 100 : 0;

  // By broker
  const byBroker: Record<string, number> = {};
  for (const p of positions) {
    const name = p.account.broker?.name ?? 'Unknown';
    byBroker[name] = (byBroker[name] ?? 0) + p.current_value;
  }

  // By account type
  const byAccountType: Record<string, number> = {};
  for (const p of positions) {
    const name = p.account.account_type?.name ?? 'Unknown';
    byAccountType[name] = (byAccountType[name] ?? 0) + p.current_value;
  }

  // By asset type
  const byAssetType: Record<string, number> = {};
  for (const p of positions) {
    const type = p.asset.asset_type.toUpperCase();
    byAssetType[type] = (byAssetType[type] ?? 0) + p.current_value;
  }

  return {
    total_value: totalValue,
    total_cost_basis: totalCostBasis,
    total_unrealized_gain_loss: totalUnrealized,
    total_unrealized_gain_loss_pct: totalUnrealizedPct,
    realized_gain_loss_ytd: realizedGainLossYtd,
    by_broker: byBroker,
    by_account_type: byAccountType,
    by_asset_type: byAssetType,
    positions,
    last_price_update: lastPriceUpdate,
  };
}

/**
 * Converts a key-value map to allocation items with percentages.
 */
export function toAllocationItems(map: Record<string, number>): AllocationItem[] {
  const total = Object.values(map).reduce((sum, v) => sum + v, 0);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: COLORS[i % COLORS.length],
    }));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatQuantity(value: number): string {
  if (value === Math.floor(value)) return value.toFixed(0);
  // Show up to 8 decimal places but trim trailing zeros
  return parseFloat(value.toFixed(8)).toString();
}
