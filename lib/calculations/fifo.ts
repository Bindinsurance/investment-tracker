import { TaxLot, RealizedGain, Transaction } from '@/types';
import { differenceInDays } from 'date-fns';

export interface FifoResult {
  lotsConsumed: Array<{
    tax_lot_id: string;
    buy_transaction_id: string;
    quantity_sold: number;
    cost_basis: number;
    acquisition_date: string;
    remaining_after: number;
  }>;
  realizedGains: Omit<RealizedGain, 'id' | 'user_id' | 'created_at'>[];
  totalProceeds: number;
  totalCostBasis: number;
  totalGainLoss: number;
  insufficientQuantity: boolean;
  availableQuantity: number;
}

/**
 * Calculates FIFO lots consumed for a SELL transaction.
 * Returns lot consumption details and realized gain records.
 */
export function calculateFifo(
  sellTransaction: Transaction,
  availableLots: TaxLot[]
): FifoResult {
  const sellDate = new Date(sellTransaction.transaction_date);
  const sellPrice = sellTransaction.unit_price;
  const totalFee = sellTransaction.fee || 0;

  // Sort lots by acquisition date ASC (FIFO)
  const sortedLots = [...availableLots].sort(
    (a, b) => new Date(a.acquisition_date).getTime() - new Date(b.acquisition_date).getTime()
  );

  const availableQuantity = sortedLots.reduce((sum, lot) => sum + lot.remaining_quantity, 0);

  if (availableLots.length === 0 || sellTransaction.quantity > availableQuantity + 0.000001) {
    return {
      lotsConsumed: [],
      realizedGains: [],
      totalProceeds: 0,
      totalCostBasis: 0,
      totalGainLoss: 0,
      insufficientQuantity: true,
      availableQuantity,
    };
  }

  let remainingToSell = sellTransaction.quantity;
  const lotsConsumed: FifoResult['lotsConsumed'] = [];
  const realizedGains: Omit<RealizedGain, 'id' | 'user_id' | 'created_at'>[] = [];

  let totalCostBasis = 0;

  for (const lot of sortedLots) {
    if (remainingToSell <= 0.000001) break;

    const quantityFromLot = Math.min(lot.remaining_quantity, remainingToSell);
    const costBasisForLot = quantityFromLot * lot.cost_basis_per_unit;
    const acquisitionDate = new Date(lot.acquisition_date);
    const holdingDays = differenceInDays(sellDate, acquisitionDate);
    const term = holdingDays > 365 ? 'long_term' : 'short_term';

    // Allocate fee proportionally across lots
    const feeAllocation = totalFee * (quantityFromLot / sellTransaction.quantity);
    const proceeds = quantityFromLot * sellPrice - feeAllocation;
    const gainLoss = proceeds - costBasisForLot;

    lotsConsumed.push({
      tax_lot_id: lot.id,
      buy_transaction_id: lot.buy_transaction_id,
      quantity_sold: quantityFromLot,
      cost_basis: costBasisForLot,
      acquisition_date: lot.acquisition_date,
      remaining_after: lot.remaining_quantity - quantityFromLot,
    });

    realizedGains.push({
      sell_transaction_id: sellTransaction.id,
      buy_transaction_id: lot.buy_transaction_id,
      tax_lot_id: lot.id,
      asset_id: sellTransaction.asset_id,
      account_id: sellTransaction.account_id,
      acquisition_date: lot.acquisition_date,
      sale_date: sellTransaction.transaction_date,
      quantity_sold: quantityFromLot,
      proceeds,
      cost_basis: costBasisForLot,
      gain_loss: gainLoss,
      holding_period_days: holdingDays,
      term,
    });

    totalCostBasis += costBasisForLot;
    remainingToSell -= quantityFromLot;
  }

  const totalProceeds = sellTransaction.quantity * sellPrice - totalFee;
  const totalGainLoss = totalProceeds - totalCostBasis;

  return {
    lotsConsumed,
    realizedGains,
    totalProceeds,
    totalCostBasis,
    totalGainLoss,
    insufficientQuantity: false,
    availableQuantity,
  };
}

/**
 * Calculates quantity from total amount and unit price.
 * quantity = (total_amount - fee) / unit_price
 */
export function calculateQuantityFromAmount(
  totalAmount: number,
  unitPrice: number,
  fee: number = 0
): number {
  if (unitPrice <= 0) return 0;
  return (totalAmount - fee) / unitPrice;
}

/**
 * Calculates quantity from sell amount.
 */
export function calculateSellQuantityFromAmount(
  totalAmount: number,
  unitPrice: number,
  fee: number = 0
): number {
  if (unitPrice <= 0) return 0;
  return (totalAmount - fee) / unitPrice;
}

/**
 * Estimates long-term capital gains tax bracket.
 */
export function estimateLongTermTaxRate(
  income: number,
  zeroPctLimit: number,
  fifteenPctLimit: number
): 0 | 15 | 20 {
  if (income <= zeroPctLimit) return 0;
  if (income <= fifteenPctLimit) return 15;
  return 20;
}
