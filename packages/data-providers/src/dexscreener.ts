import axios from 'axios';
import { MarketProvider, TokenPair, LiquidityResult, VolumeResult } from '@vouro/shared';

export class DexScreenerProvider implements MarketProvider {
  private cache: Map<string, { data: any; fetchedAt: number }> = new Map();
  private cacheDurationMs = 30000; // 30 seconds cache

  private async fetchTokenData(mint: string): Promise<any> {
    const cached = this.cache.get(mint);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < this.cacheDurationMs) {
      return cached.data;
    }

    try {
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        timeout: 5000,
      });
      const data = response.data;
      this.cache.set(mint, { data, fetchedAt: now });
      return data;
    } catch (err) {
      console.error(`DexScreener API error for mint ${mint}:`, err);
      return cached?.data || null;
    }
  }

  private getCanonicalPair(data: any): any {
    if (!data || !data.pairs || data.pairs.length === 0) return null;
    
    // Filter by chainId: solana
    const solanaPairs = data.pairs.filter((p: any) => p.chainId === 'solana');
    if (solanaPairs.length === 0) return null;

    // Sort by liquidity in USD descending
    solanaPairs.sort((a: any, b: any) => {
      const liqA = a.liquidity?.usd || 0;
      const liqB = b.liquidity?.usd || 0;
      return liqB - liqA;
    });

    return solanaPairs[0];
  }

  async getTokenPairs(mint: string): Promise<TokenPair[]> {
    const rawData = await this.fetchTokenData(mint);
    if (!rawData || !rawData.pairs) return [];

    return rawData.pairs
      .filter((p: any) => p.chainId === 'solana')
      .map((p: any) => ({
        pairAddress: p.pairAddress,
        baseToken: { address: p.baseToken.address, symbol: p.baseToken.symbol },
        quoteToken: { address: p.quoteToken.address, symbol: p.quoteToken.symbol },
        dexId: p.dexId,
        url: p.url,
      }));
  }

  async getLiquidity(mint: string): Promise<LiquidityResult> {
    const rawData = await this.fetchTokenData(mint);
    const pair = this.getCanonicalPair(rawData);
    if (!pair || !pair.liquidity) {
      return { usd: 0, base: 0, quote: 0 };
    }
    return {
      usd: pair.liquidity.usd || 0,
      base: pair.liquidity.base || 0,
      quote: pair.liquidity.quote || 0,
    };
  }

  async getVolume(mint: string): Promise<VolumeResult> {
    const rawData = await this.fetchTokenData(mint);
    const pair = this.getCanonicalPair(rawData);
    if (!pair || !pair.volume) {
      return { h24: 0, h6: 0, h1: 0, m5: 0 };
    }
    return {
      h24: pair.volume.h24 || 0,
      h6: pair.volume.h6 || 0,
      h1: pair.volume.h1 || 0,
      m5: pair.volume.m5 || 0,
    };
  }
}
