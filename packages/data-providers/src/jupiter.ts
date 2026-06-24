import axios from 'axios';
import { PriceProvider, TokenPrice } from '@vouro/shared';

export class JupiterPriceProvider implements PriceProvider {
  private cache: Map<string, { price: number; fetchedAt: number }> = new Map();
  private cacheDurationMs = 15000; // 15 seconds cache (10-20s spec)

  constructor(private apiKey?: string) {}

  async getTokenPrice(mint: string): Promise<TokenPrice> {
    const cached = this.cache.get(mint);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < this.cacheDurationMs) {
      return {
        mint,
        priceUsd: cached.price,
        fetchedAt: cached.fetchedAt,
      };
    }

    try {
      const prices = await this.getMultipleTokenPrices([mint]);
      return prices[0] || { mint, priceUsd: 0, fetchedAt: now };
    } catch (err) {
      console.error(`Failed to fetch Jupiter price for mint ${mint}:`, err);
      // Return stale cached data or zero
      return {
        mint,
        priceUsd: cached?.price || 0,
        fetchedAt: cached?.fetchedAt || now,
      };
    }
  }

  async getMultipleTokenPrices(mints: string[]): Promise<TokenPrice[]> {
    const now = Date.now();
    const result: TokenPrice[] = [];
    const mintsToFetch: string[] = [];

    // Check cache
    for (const mint of mints) {
      const cached = this.cache.get(mint);
      if (cached && now - cached.fetchedAt < this.cacheDurationMs) {
        result.push({
          mint,
          priceUsd: cached.price,
          fetchedAt: cached.fetchedAt,
        });
      } else {
        mintsToFetch.push(mint);
      }
    }

    if (mintsToFetch.length === 0) {
      return result;
    }

    try {
      // Jupiter Price API v3 endpoint: https://api.jup.ag/price/v2 or v3
      // We will use v3 endpoint as instructed (or v2 fallbacks/mock depending on availability)
      // Standard v3 URL: https://api.jup.ag/price/v3
      const ids = mintsToFetch.join(',');
      const response = await axios.get(`https://api.jup.ag/price/v3`, {
        params: { ids },
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
        timeout: 5000,
      });

      const data = response.data?.data || {};

      for (const mint of mintsToFetch) {
        const priceInfo = data[mint];
        const priceUsd = priceInfo ? parseFloat(priceInfo.price) : 0;
        
        // Cache result
        this.cache.set(mint, { price: priceUsd, fetchedAt: now });
        
        result.push({
          mint,
          priceUsd,
          fetchedAt: now,
        });
      }
    } catch (err) {
      console.error('Failed to fetch multiple Jupiter prices:', err);
      // Fallback to old cache values if present
      for (const mint of mintsToFetch) {
        const cached = this.cache.get(mint);
        result.push({
          mint,
          priceUsd: cached?.price || 0,
          fetchedAt: cached?.fetchedAt || now,
        });
      }
    }

    return result;
  }
}
