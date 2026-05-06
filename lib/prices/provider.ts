import { PriceData, PriceSource, AssetType } from '@/types';

// ============================================================
// Price Provider Abstraction Layer
// Swap providers without rewriting the app.
// ============================================================

export interface PriceProvider {
  name: PriceSource;
  fetchPrice(ticker: string): Promise<PriceData | null>;
  fetchPrices(tickers: string[]): Promise<PriceData[]>;
}

// ============================================================
// Alpha Vantage Provider
// ============================================================
export class AlphaVantageProvider implements PriceProvider {
  name: PriceSource = 'alphavantage';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchPrice(ticker: string): Promise<PriceData | null> {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const data = await res.json();
      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) return null;
      return {
        ticker,
        price: parseFloat(quote['05. price']),
        previous_close: parseFloat(quote['08. previous close']),
        source: 'alphavantage',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async fetchPrices(tickers: string[]): Promise<PriceData[]> {
    // Alpha Vantage free tier: 1 request per second
    const results: PriceData[] = [];
    for (const ticker of tickers) {
      const price = await this.fetchPrice(ticker);
      if (price) results.push(price);
      await new Promise((r) => setTimeout(r, 1200));
    }
    return results;
  }
}

// ============================================================
// Twelve Data Provider
// ============================================================
export class TwelveDataProvider implements PriceProvider {
  name: PriceSource = 'twelvedata';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchPrice(ticker: string): Promise<PriceData | null> {
    try {
      const url = `https://api.twelvedata.com/price?symbol=${ticker}&apikey=${this.apiKey}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const data = await res.json();
      if (!data.price) return null;
      return {
        ticker,
        price: parseFloat(data.price),
        source: 'twelvedata',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async fetchPrices(tickers: string[]): Promise<PriceData[]> {
    try {
      const symbols = tickers.join(',');
      const url = `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${this.apiKey}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const data = await res.json();
      const results: PriceData[] = [];

      for (const ticker of tickers) {
        const entry = data[ticker];
        if (entry?.price) {
          results.push({
            ticker,
            price: parseFloat(entry.price),
            source: 'twelvedata',
            timestamp: new Date().toISOString(),
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}

// ============================================================
// CoinGecko Provider (Crypto)
// ============================================================
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  XLM: 'stellar',
  ALGO: 'algorand',
  VET: 'vechain',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  SHIB: 'shiba-inu',
};

export class CoinGeckoProvider implements PriceProvider {
  name: PriceSource = 'coingecko';

  private getCoinId(ticker: string): string {
    return COINGECKO_ID_MAP[ticker.toUpperCase()] ?? ticker.toLowerCase();
  }

  async fetchPrice(ticker: string): Promise<PriceData | null> {
    try {
      const coinId = this.getCoinId(ticker);
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const data = await res.json();
      if (!data[coinId]?.usd) return null;
      return {
        ticker: ticker.toUpperCase(),
        price: data[coinId].usd,
        source: 'coingecko',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async fetchPrices(tickers: string[]): Promise<PriceData[]> {
    try {
      const ids = tickers.map((t) => this.getCoinId(t)).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const data = await res.json();
      const results: PriceData[] = [];

      for (const ticker of tickers) {
        const coinId = this.getCoinId(ticker);
        if (data[coinId]?.usd) {
          results.push({
            ticker: ticker.toUpperCase(),
            price: data[coinId].usd,
            source: 'coingecko',
            timestamp: new Date().toISOString(),
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}

// ============================================================
// Provider Factory
// ============================================================
export function getProviderForAsset(
  assetType: AssetType,
  source?: string | null
): PriceProvider {
  if (assetType === 'crypto') {
    return new CoinGeckoProvider();
  }

  if (source === 'twelvedata' && process.env.TWELVE_DATA_API_KEY) {
    return new TwelveDataProvider(process.env.TWELVE_DATA_API_KEY);
  }

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    return new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY);
  }

  // Fallback to Twelve Data if available
  if (process.env.TWELVE_DATA_API_KEY) {
    return new TwelveDataProvider(process.env.TWELVE_DATA_API_KEY);
  }

  // Default: CoinGecko (no key needed)
  return new CoinGeckoProvider();
}
