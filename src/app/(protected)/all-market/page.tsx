"use client";

import React, { useState, useMemo, useEffect, useRef, memo } from 'react';
import useSWR from 'swr';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Activity, BarChart2 } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- KOMPONEN TRADINGVIEW HEATMAP ---
const TradingViewHeatmap = memo(() => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    // Hapus script lama jika ada re-render
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
    script.type = "text/javascript";
    script.async = true;
    
    // Setting disesuaikan persis dengan referensi dan kebutuhan UI
    script.innerHTML = `
      {
        "exchanges": [],
        "dataSource": "AllID",
        "grouping": "sector",
        "blockSize": "volume",
        "blockColor": "change",
        "locale": "en",
        "symbolUrl": "",
        "colorTheme": "dark",
        "hasTopBar": false,
        "isDataSetEnabled": false,
        "isZoomEnabled": true,
        "hasSymbolTooltip": true,
        "isMonoSize": false,
        "width": "100%",
        "height": "100%"
      }`;
      
    container.current.appendChild(script);
  }, []);

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex-1 w-full h-full shadow-lg relative overflow-hidden">
      <div className="tradingview-widget-container h-full w-full" ref={container}>
        <div className="tradingview-widget-container__widget h-full w-full"></div>
      </div>
    </div>
  );
});
TradingViewHeatmap.displayName = "TradingViewHeatmap";

// --- TIPE DATA UTAMA ---
interface StockData {
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

type SortKey = 'symbol' | 'price' | 'percent' | 'value' | 'volume';
type SortDirection = 'asc' | 'desc';

interface GoApiPriceItem {
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

interface GoApiCompanyItem {
  symbol: string;
  name?: string;
  logo?: string;
}

const SECTORS = [
  { label: "All Market (IHSG)", code: "ALL", activeClass: "bg-gradient-to-r from-[#06b6d4] to-[#34d399] text-white border-transparent shadow-[0_4px_15px_rgba(52,211,153,0.3)]" },
  { label: "Top Liquid (LQ45)", code: "LQ45", activeClass: "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white border-transparent shadow-[0_4px_15px_rgba(236,72,153,0.3)]" },
  { label: "Technology", code: "IDXTECHNO", activeClass: "bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white border-transparent shadow-[0_4px_15px_rgba(168,85,247,0.3)]" },
  { label: "Energy", code: "IDXENERGY", activeClass: "bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white border-transparent shadow-[0_4px_15px_rgba(251,191,36,0.3)]" },
  { label: "Basic-Ind", code: "IDXBASIC", activeClass: "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white border-transparent shadow-[0_4px_15px_rgba(236,72,153,0.3)]" },
  { label: "Infrastructure", code: "IDXINFRA", activeClass: "bg-gradient-to-r from-[#64748b] to-[#94a3b8] text-white border-transparent shadow-[0_4px_15px_rgba(148,163,184,0.3)]" },
  { label: "Transport", code: "IDXTRANS", activeClass: "bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] text-white border-transparent shadow-[0_4px_15px_rgba(56,189,248,0.3)]" },
  { label: "Health", code: "IDXHEALTH", activeClass: "bg-gradient-to-r from-[#10b981] to-[#34d399] text-white border-transparent shadow-[0_4px_15px_rgba(52,211,153,0.3)]" },
  { label: "Industrial", code: "IDXINDUST", activeClass: "bg-gradient-to-r from-[#f59e0b] to-[#fcd34d] text-[#121212] border-transparent shadow-[0_4px_15px_rgba(252,211,77,0.3)]" },
  { label: "Finance", code: "IDXFINANCE", activeClass: "bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white border-transparent shadow-[0_4px_15px_rgba(59,130,246,0.3)]" },
  { label: "Cyclical", code: "IDXCYCLIC", activeClass: "bg-gradient-to-r from-[#ec4899] to-[#f43f5e] text-white border-transparent shadow-[0_4px_15px_rgba(244,63,94,0.3)]" },
  { label: "Property", code: "IDXPROPERT", activeClass: "bg-gradient-to-r from-[#84cc16] to-[#bef264] text-[#121212] border-transparent shadow-[0_4px_15px_rgba(190,242,100,0.3)]" },
  { label: "Non-Cyclical", code: "IDXNONCYC", activeClass: "bg-gradient-to-r from-[#14b8a6] to-[#2dd4bf] text-white border-transparent shadow-[0_4px_15px_rgba(45,212,191,0.3)]" }
];

const formatNumber = (num: number): string => {
  if (!num) return "-";
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString("id-ID");
};

// --- ENTERPRISE ENGINE: BATCHED & THROTTLED FETCHING ---
const fetchSectorStocks = async (keyArgs: [string, string]) => {
  const activeSector = keyArgs[1]; 
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };

  let symbolsToFetch: string[] = [];

  if (activeSector === "ALL") {
    const companies = useCompanyStore.getState().companies;
    symbolsToFetch = Object.keys(companies);

    if (symbolsToFetch.length === 0) {
      const resComp = await fetch('https://api.goapi.io/stock/idx/companies', { headers });
      const dataComp = await resComp.json();
      if (dataComp?.status === "success" && Array.isArray(dataComp?.data?.results)) {
        symbolsToFetch = dataComp.data.results.map((c: GoApiCompanyItem) => c.symbol);
      }
    }
  } else {
    const resItems = await fetch(`https://api.goapi.io/stock/idx/index/${activeSector}/items`, { headers });
    const dataItems = await resItems.json();
    symbolsToFetch = dataItems?.status === "success" ? dataItems.data.results : [];
  }

  if (symbolsToFetch.length === 0) throw new Error("Tidak ada saham yang ditemukan.");

  const batches: string[] = [];
  for (let i = 0; i < symbolsToFetch.length; i += 50) {
    batches.push(symbolsToFetch.slice(i, i + 50).join(','));
  }

  const allStocksRaw: GoApiPriceItem[] = [];
  
  const chunkSize = 4;
  for (let i = 0; i < batches.length; i += chunkSize) {
    const currentBatches = batches.slice(i, i + chunkSize);
    const promises = currentBatches.map(batch => 
      fetch(`https://api.goapi.io/stock/idx/prices?symbols=${batch}`, { headers }).then(res => res.json())
    );
    
    const results = await Promise.all(promises);
    
    results.forEach(batchResult => {
      if (batchResult?.status === "success" && Array.isArray(batchResult?.data?.results)) {
        allStocksRaw.push(...batchResult.data.results);
      }
    });

    if (i + chunkSize < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return allStocksRaw;
};

export default function AllMarketPage() {
  const [viewMode, setViewMode] = useState<"HEATMAP" | "LIST">("HEATMAP");

  const [activeSector, setActiveSector] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>('value'); 
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const getCompany = useCompanyStore(state => state.getCompany);

  const refreshInterval = activeSector === "ALL" ? 30000 : 15000;

  const { data: rawStocks, error, isLoading } = useSWR(
    viewMode === "LIST" ? ['market-sector-data', activeSector] : null,
    fetchSectorStocks,
    { refreshInterval, dedupingInterval: 5000 }
  );

  const stocks = useMemo<StockData[]>(() => {
    if (!rawStocks) return [];

    const mapped: StockData[] = rawStocks.map(item => {
      const masterData = getCompany(item.symbol);
      const currentPrice = item.close || 0;
      const currentVolume = item.volume || 0;

      return {
        symbol: item.symbol,
        name: masterData?.name || item.company?.name || item.symbol,
        price: currentPrice,
        open: item.open || currentPrice,
        high: item.high || currentPrice,
        low: item.low || currentPrice,
        change: item.change || 0,
        percent: item.change_pct || 0,
        volume: currentVolume,
        value: currentPrice * currentVolume, 
        logoUrl: masterData?.logo || item.company?.logo || `https://s3.goapi.io/logo/${item.symbol}.jpg`
      };
    });

    return mapped.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [rawStocks, getCompany, sortKey, sortDir]);

  const analytics = useMemo(() => {
    if (stocks.length === 0) return null;
    let advances = 0, declines = 0, flat = 0, totalVal = 0, totalVol = 0;
    let topGainer = stocks[0];
    let topLoser = stocks[stocks.length - 1];

    stocks.forEach(s => {
      if (s.change > 0) advances++;
      else if (s.change < 0) declines++;
      else flat++;

      totalVal += s.value;
      totalVol += s.volume;

      if (s.percent > topGainer.percent) topGainer = s;
      if (s.percent < topLoser.percent) topLoser = s;
    });

    return { advances, declines, flat, totalVal, totalVol, topGainer, topLoser };
  }, [stocks]);

  const handleSort = (key: SortKey) => {
    setSortDir(sortKey === key && sortDir === 'asc' ? 'desc' : 'asc');
    setSortKey(key);
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="text-neutral-600 ml-1" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-[#10b981] ml-1" /> : <ArrowDown size={12} className="text-[#ef4444] ml-1" />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-42px)] overflow-hidden p-4 relative">
      
      {/* --- MENU SWITCHER (HEATMAP VS LIST) DENGAN GRADIENT PREMIUM --- */}
      <div className="flex items-center space-x-2 mb-4 shrink-0">
        <div className="flex bg-[#1e1e1e] rounded-full p-1 border border-[#2d2d2d]">
          <button 
            onClick={() => setViewMode("HEATMAP")}
            className={`px-6 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 ${
              viewMode === "HEATMAP" 
                ? "bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white shadow-[0_4px_15px_rgba(236,72,153,0.4)]" 
                : "text-neutral-500 hover:text-white"
            }`}
          >
            HEATMAPS
          </button>
          <button 
            onClick={() => setViewMode("LIST")}
            className={`px-6 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 ${
              viewMode === "LIST" 
                ? "bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white shadow-[0_4px_15px_rgba(236,72,153,0.4)]" 
                : "text-neutral-500 hover:text-white"
            }`}
          >
            LIST MARKET
          </button>
        </div>
      </div>

      {/* --- RENDER VIEW BERDASARKAN MODE --- */}
      {viewMode === "HEATMAP" ? (
        
        <TradingViewHeatmap />

      ) : (
        <>
          {/* TABEL DATA LIST */}
          <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-3 shrink-0">
            {SECTORS.map((sector) => (
              <button
                key={sector.code}
                onClick={() => setActiveSector(sector.code)}
                className={`whitespace-nowrap px-5 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 border ${
                  activeSector === sector.code ? sector.activeClass : "bg-transparent border-[#2d2d2d] text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                }`}
              >
                {sector.label}
              </button>
            ))}
          </div>

          {!isLoading && analytics && (
            <div className="grid grid-cols-4 gap-4 mb-3 shrink-0">
              <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-3 flex flex-col justify-center shadow-md">
                <div className="flex items-center space-x-1.5 text-neutral-400 mb-2 text-[10px] font-bold uppercase tracking-wider">
                  <Activity size={12} /> <span>Market Breadth</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <div className="flex flex-col items-center"><span className="text-[#10b981] font-bold text-sm">{analytics.advances}</span><span className="text-[9px] text-neutral-500">Up</span></div>
                  <div className="flex flex-col items-center"><span className="text-neutral-300 font-bold text-sm">{analytics.flat}</span><span className="text-[9px] text-neutral-500">Flat</span></div>
                  <div className="flex flex-col items-center"><span className="text-[#ef4444] font-bold text-sm">{analytics.declines}</span><span className="text-[9px] text-neutral-500">Down</span></div>
                </div>
              </div>
              <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-3 flex flex-col justify-center shadow-md">
                <div className="flex items-center space-x-1.5 text-neutral-400 mb-2 text-[10px] font-bold uppercase tracking-wider">
                  <BarChart2 size={12} /> <span>Turnover</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col"><span className="text-white font-bold text-[13px]">{formatNumber(analytics.totalVal)}</span><span className="text-[9px] text-neutral-500">Value (Rp)</span></div>
                  <div className="flex flex-col text-right"><span className="text-white font-bold text-[13px]">{formatNumber(analytics.totalVol)}</span><span className="text-[9px] text-neutral-500">Volume</span></div>
                </div>
              </div>
              <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-3 flex flex-col justify-center shadow-md border-l-2 border-l-[#10b981]">
                <div className="flex items-center space-x-1.5 text-neutral-400 mb-1 text-[10px] font-bold uppercase tracking-wider">
                  <TrendingUp size={12} className="text-[#10b981]" /> <span>Top Gainer</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-white font-bold text-sm">{analytics.topGainer?.symbol || "-"}</span>
                  <span className="text-[#10b981] font-bold text-sm">+{analytics.topGainer?.percent.toFixed(2)}%</span>
                </div>
              </div>
              <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-3 flex flex-col justify-center shadow-md border-l-2 border-l-[#ef4444]">
                <div className="flex items-center space-x-1.5 text-neutral-400 mb-1 text-[10px] font-bold uppercase tracking-wider">
                  <TrendingDown size={12} className="text-[#ef4444]" /> <span>Top Loser</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-white font-bold text-sm">{analytics.topLoser?.symbol || "-"}</span>
                  <span className="text-[#ef4444] font-bold text-sm">{analytics.topLoser?.percent.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg relative">
            
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#1e1e1e]/50 border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-400 shrink-0 select-none uppercase tracking-wider">
              <div className="col-span-3 flex items-center cursor-pointer group hover:text-white" onClick={() => handleSort('symbol')}>
                Company {getSortIcon('symbol')}
              </div>
              <div className="col-span-2 flex items-center justify-end cursor-pointer group hover:text-white" onClick={() => handleSort('percent')}>
                Price & Chg {getSortIcon('percent')}
              </div>
              <div className="col-span-3 flex items-center justify-center text-center">
                Intraday Range (OHLC)
              </div>
              <div className="col-span-2 flex items-center justify-end cursor-pointer group hover:text-white" onClick={() => handleSort('volume')}>
                Volume {getSortIcon('volume')}
              </div>
              <div className="col-span-2 flex items-center justify-end cursor-pointer group hover:text-white" onClick={() => handleSort('value')}>
                Turnover {getSortIcon('value')}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar">
              {isLoading && stocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[#10b981] text-xs font-bold animate-pulse">
                    {activeSector === "ALL" ? "Menyinkronkan 940+ Saham BEI..." : `Scanning Data ${activeSector}...`}
                  </span>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-full text-[#ef4444] text-xs font-medium">{error || "Gagal memuat API"}</div>
              ) : stocks.length === 0 ? (
                <div className="flex justify-center items-center h-full text-neutral-500 text-xs font-medium">Tidak ada data di sektor ini.</div>
              ) : (
                stocks.map((stock) => {
                  
                  const rangeDiff = stock.high - stock.low;
                  let openPercent = 0;
                  let closePercent = 0;

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
                    <div key={stock.symbol} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[#2d2d2d]/50 hover:bg-[#1e1e1e] transition-colors items-center group">
                      
                      <div className="col-span-3 flex items-center space-x-3 overflow-hidden">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-neutral-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={stock.logoUrl} alt={stock.symbol} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-[13px] tabular-nums tracking-tight">{stock.symbol}</span>
                          <span className="text-neutral-400 text-[10px] truncate max-w-[150px]">{stock.name}</span>
                        </div>
                      </div>

                      <div className="col-span-2 flex flex-col justify-center items-end tabular-nums">
                        <span className="text-white font-bold text-[13px]">{stock.price.toLocaleString("id-ID")}</span>
                        <span className={`text-[10px] font-bold ${stock.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                          {stock.change > 0 ? "+" : ""}{stock.change.toLocaleString("id-ID")} ({stock.change > 0 ? "+" : ""}{stock.percent.toFixed(2)}%)
                        </span>
                      </div>

                      <div className="col-span-3 flex items-center justify-center px-4 relative cursor-crosshair group/ohlc">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover/ohlc:flex bg-[#1e1e1e] border border-[#2d2d2d] text-white text-[9px] px-2 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap z-[100]">
                          O: {stock.open.toLocaleString('id-ID')} | H: {stock.high.toLocaleString('id-ID')} | L: {stock.low.toLocaleString('id-ID')} | C: {stock.price.toLocaleString('id-ID')}
                        </div>

                        <span className="text-[10px] font-medium text-neutral-500 mr-2 w-8 text-right tabular-nums">{stock.low}</span>
                        
                        <div className="flex-1 h-1.5 bg-[#2d2d2d] rounded-full relative shadow-inner overflow-hidden flex items-center">
                          {rangeDiff > 0 ? (
                            <>
                              <div 
                                className={`absolute h-full ${bodyColor} opacity-90`}
                                style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
                              />
                              <div 
                                className="absolute h-[150%] w-[2px] bg-white z-10 rounded-sm"
                                style={{ left: `${openPercent}%`, transform: 'translateX(-50%)' }}
                              />
                            </>
                          ) : (
                            <div className={`absolute h-[150%] w-[3px] ${bodyColor} z-10 rounded-sm`} style={{ left: '50%', transform: 'translateX(-50%)' }} />
                          )}
                        </div>

                        <span className="text-[10px] font-medium text-neutral-500 ml-2 w-8 text-left tabular-nums">{stock.high}</span>
                      </div>

                      <div className="col-span-2 flex flex-col justify-center items-end tabular-nums">
                        <span className="text-neutral-200 font-bold text-[12px]">{formatNumber(stock.volume)}</span>
                        <span className="text-neutral-500 text-[9px] font-medium uppercase tracking-wider">Shares</span>
                      </div>

                      <div className="col-span-2 flex flex-col justify-center items-end tabular-nums">
                        <span className="text-white font-bold text-[12px]">{formatNumber(stock.value)}</span>
                        <span className="text-neutral-500 text-[9px] font-medium uppercase tracking-wider">IDR</span>
                      </div>
                      
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
}