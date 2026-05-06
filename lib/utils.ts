import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '$—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value === Math.floor(value)) return value.toLocaleString('en-US');
  return parseFloat(value.toFixed(8)).toString();
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function startOfYear(year = new Date().getFullYear()): string {
  return `${year}-01-01`;
}

export function endOfYear(year = new Date().getFullYear()): string {
  return `${year}-12-31`;
}

export function classifyGainLoss(value: number): 'profit' | 'loss' | 'neutral' {
  if (value > 0) return 'profit';
  if (value < 0) return 'loss';
  return 'neutral';
}

export function getAssetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    stock: 'Stock',
    etf: 'ETF',
    crypto: 'Crypto',
  };
  return map[type] ?? type;
}

export function getTermLabel(term: string): string {
  return term === 'long_term' ? 'Long-term' : 'Short-term';
}

export function getFilingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    single: 'Single',
    married_filing_jointly: 'Married Filing Jointly',
    married_filing_separately: 'Married Filing Separately',
    head_of_household: 'Head of Household',
  };
  return map[status] ?? status;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
