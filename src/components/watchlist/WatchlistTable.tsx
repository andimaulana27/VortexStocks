// src/components/watchlist/WatchlistTable.tsx
"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Star, Trash2, 
  BarChart2, PieChart 
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { StockData, SortKey, SortDirection, WatchlistGroup } from '@/type/watchlist';
import BrokerProfilerModal from '@/components/watchlist/BrokerProfilerModal'; 

// IMPORT MODAL OWNERSHIP BARU
import OwnershipAnalysisModal from '@/components/watchlist/OwnershipAnalysisModal'; 

interface WatchlistTableProps {
  isInitialized: boolean;
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
  hasRawStocksData: boolean;
  activeWatchlist: WatchlistGroup | undefined;
  filteredStocks: StockData[];
  sortKey: SortKey;
  sortDir: SortDirection;
  handleSort: (key: SortKey) => void;
  triggerDeleteSymbol: (symbol: string) => void;
}

// ... [Kode Interfaces & Helpers formatNumber, getEffectiveDateAPI tetap sama seperti sebelumnya] ...

interface GoApiHistoryItem {
  date?: string;
  close?: number;
  volume?: number;
}

interface GoApiBrokerItem {
  broker?: { code?: string };
  code?: string;
  investor?: string;
  side?: string;
  value?: number;
}

const formatNumber = (num: number): string => {
  if (!num) return "0";
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(1) + 'T';
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(1) + 'B';
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(1) + 'M';
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(1) + 'K';
  return num.toLocaleString("id-ID");
};

const getEffectiveDateAPI = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; 
  else if (day === 6) offset = 1; 
  else if (day === 1 && hours < 16) offset = 3; 
  else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const fetchRowExtraData = async (symbol: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
  
  const effectiveDate = getEffectiveDateAPI();
  const today = new Date();
  const past20 = new Date();
  past20.setDate(today.getDate() - 20); 
  
  const todayStr = today.toISOString().split('T')[0];
  const past20Str = past20.toISOString().split('T')[0];

  try {
    const [histRes, brokerRes] = await Promise.all([
      fetch(`https://api.goapi.io/stock/idx/${symbol}/historical?from=${past20Str}&to=${todayStr}`, { headers }).then(res => res.json()).catch(() => null),
      fetch(`https://api.goapi.io/stock/idx/${symbol}/broker_summary?date=${effectiveDate}&investor=ALL`, { headers }).then(res => res.json()).catch(() => null)
    ]);

    const history: GoApiHistoryItem[] = histRes?.data?.results || [];
    let brokers: GoApiBrokerItem[] = brokerRes?.data?.results || [];

    if (brokers.length === 0 && history.length > 0) {
      const actualLastDate = history[history.length - 1].date;
      if (actualLastDate && actualLastDate !== effectiveDate) {
        const retryBroker = await fetch(`https://api.goapi.io/stock/idx/${symbol}/broker_summary?date=${actualLastDate}&investor=ALL`, { headers }).then(res => res.json()).catch(() => null);
        brokers = retryBroker?.data?.results || [];
      }
    }

    let topBuyers: { code: string; net: number }[] = [];
    let topSellers: { code: string; net: number }[] = [];
    let volRatio = 0;

    if (history.length > 0) {
      const totalVol = history.reduce((sum: number, item: GoApiHistoryItem) => sum + (item.volume || 0), 0);
      const avgVol = totalVol / history.length;
      if (avgVol > 0) {
        const latestVol = history[history.length - 1].volume || 0; 
        volRatio = latestVol / avgVol;
      }
    }

    if (brokers.length > 0) {
      const brokerMap: Record<string, { net: number }> = {};

      brokers.forEach((b: GoApiBrokerItem) => {
        const bCode = b.broker?.code || b.code || "-";
        const bValue = b.value || 0;

        if (!brokerMap[bCode]) brokerMap[bCode] = { net: 0 };
        if (b.side === 'BUY') brokerMap[bCode].net += bValue;
        if (b.side === 'SELL') brokerMap[bCode].net -= bValue;
      });

      const sortedBrokers = Object.entries(brokerMap).map(([code, data]) => ({ code, ...data }));
      topBuyers = [...sortedBrokers].sort((a,b) => b.net - a.net).filter(b => b.net > 0).slice(0, 3);
      topSellers = [...sortedBrokers].sort((a,b) => a.net - b.net).filter(b => b.net < 0).slice(0, 3);
    }

    return { history: history.slice(-14), topBuyers, topSellers, volRatio };
  } catch {
    return { history: [], topBuyers: [], topSellers: [], volRatio: 0 };
  }
};

// --- KOMPONEN BARIS INDIVIDUAL ---
const WatchlistRow = ({ 
  stock, 
  triggerDeleteSymbol,
  onOpenProfiler,
  onOpenOwnership // PROPS BARU UNTUK BUKA MODAL OWNERSHIP
}: { 
  stock: StockData, 
  triggerDeleteSymbol: (s: string) => void,
  onOpenProfiler: (s: string) => void,
  onOpenOwnership: (s: string) => void
}) => {
  const { data: extraData } = useSWR(
    ['row-extra', stock.symbol],
    () => fetchRowExtraData(stock.symbol),
    { dedupingInterval: 60000, revalidateOnFocus: false } 
  );

  const histLength = extraData?.history?.length || 0;
  const lastClose = extraData?.history?.[histLength - 1]?.close ?? 0;
  const firstClose = extraData?.history?.[0]?.close ?? 0;

  const isTrendUp = histLength > 1 ? (lastClose >= firstClose) : stock.change >= 0;

  const rangeDiff = stock.high - stock.low;
  let openPercent = 0, closePercent = 0;

  if (rangeDiff > 0) {
    openPercent = ((stock.open - stock.low) / rangeDiff) * 100;
    closePercent = ((stock.price - stock.low) / rangeDiff) * 100;
  } else {
    openPercent = 50; closePercent = 50;
  }

  const isIntradayUp = stock.price >= stock.open;
  const bodyColor = isIntradayUp ? 'bg-[#10b981]' : 'bg-[#ef4444]';
  const fillLeft = Math.min(openPercent, closePercent);
  const fillWidth = Math.max(Math.abs(closePercent - openPercent), 2);

  return (
    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_1.2fr_1fr_1fr_2fr_1.5fr_100px] gap-3 px-4 py-3 border-b border-[#2d2d2d]/50 hover:bg-[#1e1e1e] transition-colors items-center group min-w-[1400px]">
      
      {/* ... [KODE KOLOM TABEL LAINNYA SAMA SEPERTI SEBELUMNYA] ... */}
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-[#2d2d2d] shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stock.logoUrl} alt={stock.symbol} className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }} />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-black text-[13px] tracking-tight">{stock.symbol}</span>
          <span className="text-neutral-500 text-[10px] truncate max-w-[120px] font-medium">{stock.name}</span>
        </div>
      </div>

      <div className="h-[28px] w-full px-2 opacity-80 group-hover:opacity-100 transition-opacity">
        {extraData?.history && extraData.history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={extraData.history}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line type="monotone" dataKey="close" stroke={isTrendUp ? '#ff4d94' : '#ef4444'} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex justify-center items-center text-[10px] text-neutral-600">...</div>
        )}
      </div>

      <div className="flex justify-center items-center">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${stock.change >= 0 ? "border-[#10b981]/20 bg-[#10b981]/10 text-[#10b981]" : "border-[#ef4444]/20 bg-[#ef4444]/10 text-[#ef4444]"}`}>
          {stock.change > 0 ? "+" : ""}{stock.percent.toFixed(2)}%
        </span>
      </div>

      <div className="text-right">
        <span className="text-white font-bold text-[13px] tabular-nums">{stock.price.toLocaleString("id-ID")}</span>
      </div>

      <div className="flex flex-col justify-center items-end tabular-nums">
        <span className="text-[#3b82f6] font-bold text-[11px]">--%</span>
        <span className="text-neutral-500 font-medium text-[9px]">--</span>
      </div>

      <div className="text-right">
        <span className="text-white font-bold text-[12px] tabular-nums">{formatNumber(stock.value)}</span>
      </div>

      <div className="text-right">
        <span className="text-neutral-300 font-medium text-[12px] tabular-nums">{formatNumber(stock.volume)}</span>
      </div>

      <div className="flex justify-center items-center">
        <span className="text-[10px] font-bold px-2.5 py-1 bg-[#2d2d2d] text-neutral-300 rounded-md">
          {extraData ? `${extraData.volRatio.toFixed(1)}x` : '...'}
        </span>
      </div>

      <div className="flex items-center justify-center px-2 relative cursor-crosshair group/ohlc">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover/ohlc:flex bg-[#1e1e1e] border border-[#2d2d2d] text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-[100]">
          O: {stock.open.toLocaleString()} | H: {stock.high.toLocaleString()} | L: {stock.low.toLocaleString()} | C: {stock.price.toLocaleString()}
        </div>
        <span className="text-[9px] font-medium text-neutral-500 mr-2 w-7 text-right tabular-nums">{stock.low}</span>
        <div className="flex-1 h-1 bg-[#2d2d2d] rounded-full relative shadow-inner overflow-hidden flex items-center max-w-[100px]">
          {rangeDiff > 0 ? (
            <>
              <div className={`absolute h-full ${bodyColor} opacity-90`} style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }} />
              <div className="absolute h-[150%] w-[2px] bg-white z-10 rounded-sm" style={{ left: `${openPercent}%`, transform: 'translateX(-50%)' }} />
            </>
          ) : (
            <div className={`absolute h-[150%] w-[3px] ${bodyColor} z-10 rounded-sm`} style={{ left: '50%', transform: 'translateX(-50%)' }} />
          )}
        </div>
        <span className="text-[9px] font-medium text-neutral-500 ml-2 w-7 text-left tabular-nums">{stock.high}</span>
      </div>

      <div className="flex flex-col items-center justify-center text-[9px] font-black w-full px-2 gap-1.5">
        {!extraData ? <span className="text-neutral-600">Loading...</span> : (
          <>
            <div className="flex items-center justify-between w-full max-w-[90px]">
              <div className="flex gap-1">
                {extraData.topBuyers.map(b => (
                  <span key={`buy-${b.code}`} className="text-[#10b981] bg-[#10b981]/10 px-1 rounded-sm">{b.code}</span>
                ))}
              </div>
              <span className="text-neutral-500 text-[8px] font-medium">BUY</span>
            </div>
            <div className="w-full max-w-[90px] h-px bg-[#2d2d2d]"></div>
            <div className="flex items-center justify-between w-full max-w-[90px]">
              <div className="flex gap-1">
                {extraData.topSellers.map(b => (
                  <span key={`sell-${b.code}`} className="text-[#ef4444] bg-[#ef4444]/10 px-1 rounded-sm">{b.code}</span>
                ))}
              </div>
              <span className="text-neutral-500 text-[8px] font-medium">SELL</span>
            </div>
          </>
        )}
      </div>

      {/* 11. ACTIONS - TRIGGER OWNERSHIP MODAL KETIKA DIKLIK */}
      <div className="flex items-center justify-end gap-2 pr-2">
        <button 
          onClick={() => onOpenProfiler(stock.symbol)}
          className="p-1.5 text-[#06b6d4] hover:bg-[#06b6d4]/10 rounded-md transition-all duration-200" 
          title="View Broker Profiler"
        >
          <BarChart2 size={16} />
        </button>
        <button 
          onClick={() => onOpenOwnership(stock.symbol)} // EVENT KLIK BARU
          className="p-1.5 text-[#eab308] hover:bg-[#eab308]/10 rounded-md transition-all duration-200" 
          title="View Ownership Analysis"
        >
          <PieChart size={16} />
        </button>
        <div className="w-px h-4 bg-[#2d2d2d] mx-1"></div>
        <button 
          onClick={() => triggerDeleteSymbol(stock.symbol)}
          className="p-1.5 text-neutral-600 hover:bg-[#ef4444] hover:text-white rounded-md transition-all duration-200"
          title={`Hapus ${stock.symbol}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
      
    </div>
  );
};

// --- KOMPONEN UTAMA TABEL ---
export default function WatchlistTable({
  isInitialized, isLoading, error, hasRawStocksData, activeWatchlist, 
  filteredStocks, sortKey, sortDir, handleSort, triggerDeleteSymbol
}: WatchlistTableProps) {
  
  const [profilerSymbol, setProfilerSymbol] = useState<string | null>(null);
  
  // STATE BARU UNTUK KONTROL MODAL OWNERSHIP
  const [ownershipSymbol, setOwnershipSymbol] = useState<string | null>(null);

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="text-neutral-600 ml-1" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-[#10b981] ml-1" /> : <ArrowDown size={12} className="text-[#ef4444] ml-1" />;
  };

  const activeSymbols = activeWatchlist?.symbols || [];

  return (
    <>
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg relative">
        <div className="overflow-x-auto hide-scrollbar">
          
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_1.2fr_1fr_1fr_2fr_1.5fr_100px] gap-3 px-4 py-4 bg-[#121212] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-400 shrink-0 select-none tracking-wider min-w-[1400px]">
            <div className="text-left cursor-pointer group hover:text-white flex items-center" onClick={() => handleSort('symbol')}>
              CODE {getSortIcon('symbol')}
            </div>
            <div className="text-center">TRENDS (14D)</div>
            <div className="text-center cursor-pointer group hover:text-white flex items-center justify-center" onClick={() => handleSort('percent')}>
              % CHG {getSortIcon('percent')}
            </div>
            <div className="text-right cursor-pointer group hover:text-white flex items-center justify-end" onClick={() => handleSort('price')}>
              PRICE {getSortIcon('price')}
            </div>
            <div className="text-right">OWN. % / SHARES</div>
            <div className="text-right cursor-pointer group hover:text-white flex items-center justify-end" onClick={() => handleSort('value')}>
              EST VALUE {getSortIcon('value')}
            </div>
            <div className="text-right cursor-pointer group hover:text-white flex items-center justify-end" onClick={() => handleSort('volume')}>
              VOL {getSortIcon('volume')}
            </div>
            <div className="text-center">VOL RATIO 1D</div>
            <div className="text-center">INTRADAY RANGE</div>
            <div className="text-center">TOP BROKERS</div>
            <div className="text-right pr-2">ACTIONS</div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar min-w-[1400px] h-full pb-10 bg-[#121212]">
            {!isInitialized || (isLoading && !hasRawStocksData) ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-6 h-6 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[#06b6d4] text-xs font-bold animate-pulse">Menyelaraskan {activeWatchlist?.name}...</span>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-20 text-[#ef4444] text-xs font-medium">{error.message}</div>
            ) : activeSymbols.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-20 text-neutral-500 text-xs font-medium space-y-2">
                <Star size={32} className="text-neutral-700" />
                <span>Daftar &quot;{activeWatchlist?.name}&quot; masih kosong.</span>
                <span>Ketik kode saham di atas untuk menambahkan (Maks 20).</span>
              </div>
            ) : filteredStocks.length === 0 ? (
               <div className="flex justify-center items-center py-20 text-neutral-500 text-xs font-medium">Tidak ada saham yang sesuai dengan filter.</div>
            ) : (
              filteredStocks.map((stock) => (
                <WatchlistRow 
                  key={stock.symbol} 
                  stock={stock} 
                  triggerDeleteSymbol={triggerDeleteSymbol} 
                  onOpenProfiler={setProfilerSymbol}
                  onOpenOwnership={setOwnershipSymbol} // Teruskan setter modal ownership ke baris
                />
              ))
            )}
          </div>

        </div>
      </div>

      <BrokerProfilerModal 
        symbol={profilerSymbol} 
        onClose={() => setProfilerSymbol(null)} 
      />

      {/* RENDER MODAL OWNERSHIP DI SINI KETIKA STATE TERISI */}
      <OwnershipAnalysisModal 
        symbol={ownershipSymbol} 
        onClose={() => setOwnershipSymbol(null)} 
      />
    </>
  );
}