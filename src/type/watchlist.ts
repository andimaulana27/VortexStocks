// src/types/watchlist.ts

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  percent: number;
  volume: number;
  value: number;
  logoUrl: string;
}

export type SortKey = 'symbol' | 'price' | 'percent' | 'value' | 'volume';
export type SortDirection = 'asc' | 'desc';

export interface GoApiPriceItem {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  change_pct: number;
  volume: number;
  company?: { name?: string; logo?: string; };
}

export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: string[];
}

export interface DeleteModalState {
  isOpen: boolean;
  type: 'GROUP' | 'SYMBOL' | null;
  targetId: string | null;
  targetName: string;
}