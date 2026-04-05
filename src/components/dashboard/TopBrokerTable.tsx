// src/components/dashboard/TopBrokerTable.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Calendar, Info } from 'lucide-react';
import useSWR from 'swr'; 
import { useCompanyStore } from '@/store/useCompanyStore';
import BrokerDetailModal, { StockActivity } from '@/components/modals/BrokerDetailModal';

// --- PROPS BARU DARI DASHBOARD ---
interface TopBrokerTableProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

// --- TIPE DATA API ---
interface GoApiBrokerItem {
  broker?: { code: string; name: string; };
  code?: string; side: string; lot: number; value: number;
  investor: string; avg?: number; symbol: string;
}

interface GoApiStockItem {
  symbol: string; close: number; change: number; percent: number; volume?: number;
  company?: { name: string; logo?: string; };
}

interface GoApiPriceItem {
  symbol: string;
  volume?: number;
}

interface GoApiTrendItem {
  symbol: string;
}

// --- TIPE DATA UI/KALKULASI ---
interface BrokerAggregated {
  code: string; name: string; investor: string;
  tVal: number; nVal: number; bVal: number; sVal: number; tLot: number;
  avgBuy: number; avgSell: number;
}

// --- FUNGSI HELPER ---
const formatNumber = (num?: number): string => {
  if (num === undefined || num === null || num === 0) return "-";
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(2) + 'K';
  return absNum.toString();
};

const getEffectiveDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const getBrokerColorClass = (code: string, investor: string): string => {
  const bumnCodes = ["CC", "NI", "OD"]; 
  const foreignCodes = ["AK", "BK", "CS", "CG", "DB", "DX", "FS", "GW", "KZ", "ML", "MS", "RX", "ZP", "YU", "BB"];
  
  if (investor.toUpperCase() === 'FOREIGN' || foreignCodes.includes(code.toUpperCase())) {
    return "text-[#ef4444]"; 
  }
  if (bumnCodes.includes(code.toUpperCase())) {
    return "text-[#10b981]"; 
  }
  return "text-[#a855f7]"; 
};

// --- FETCHER UNTUK BROKER & STOCKS ---
const fetchBrokerSummary = async (url: string) => {
  const res = await fetch(url, { headers: { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' }});
  if (!res.ok) throw new Error("Gagal memuat data broker.");
  const json = await res.json();
  if (json.status !== "success" || !Array.isArray(json.data?.results) || json.data.results.length === 0) {
    throw new Error(`Data broker belum tersedia.`);
  }
  return json.data.results as GoApiBrokerItem[];
};

const fetchTopStocks = async () => {
  const headers = { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' };
  
  const [resG, resL] = await Promise.all([
    fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }),
    fetch('https://api.goapi.io/stock/idx/top_loser', { headers })
  ]);
  
  const [gainers, losers] = await Promise.all([resG.json(), resL.json()]);
  
  const gainerResults = (gainers.data?.results || []) as GoApiStockItem[];
  const loserResults = (losers.data?.results || []) as GoApiStockItem[];

  const allSymbols = [...gainerResults, ...loserResults].map(s => s.symbol).join(',');

  if (allSymbols) {
    try {
      const priceRes = await fetch(`https://api.goapi.io/stock/idx/prices?symbols=${allSymbols}`, { headers });
      const priceJson = await priceRes.json();
      
      const priceData: GoApiPriceItem[] = priceJson.data?.results || [];
      const volumeMap: Record<string, number> = {};
      
      priceData.forEach((item) => {
        volumeMap[item.symbol] = item.volume || 0;
      });

      gainerResults.forEach(item => { item.volume = volumeMap[item.symbol]; });
      loserResults.forEach(item => { item.volume = volumeMap[item.symbol]; });
    } catch (err) {
      console.warn("Gagal menyinkronkan volume", err);
    }
  }

  return { gainers: gainerResults, losers: losers.data?.results || [] };
};

export default function TopBrokerTable({ customDate, dateMode, startDate, endDate }: TopBrokerTableProps) {
  const [activeTab, setActiveTab] = useState<"Top Broker" | "Top Stock">("Top Broker");
  
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  
  // STATE GLOBAL ZUSTAND
  const setGlobalActiveSymbol = useCompanyStore(state => state.setActiveSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);

  const simulatedMarketSymbol = "BBRI"; 

  // STATE UNTUK MODAL
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    brokerCode: string;
    brokerName: string;
    investorType: string;
    totalNetVal: number;
    totalNetLot: number;
    avgPrice: number;
  } | null>(null);

  // BUILD URL UNTUK SWR 1 DENGAN PARAMETER TANGGAL DINAMIS
  const brokerUrl = useMemo(() => {
    if (activeTab !== "Top Broker") return null;
    
    // FIX ERROR: Mengganti 'let base' menjadi 'const base'
    const base = `https://api.goapi.io/stock/idx/${simulatedMarketSymbol}/broker_summary`;
    const params = new URLSearchParams();
    params.append('investor', 'ALL');
    
    if (dateMode === 'single' && customDate) {
      params.append('date', customDate);
    } else if (dateMode === 'range' && startDate && endDate) {
      params.append('from', startDate);
      params.append('to', endDate);
    } else {
      params.append('date', getEffectiveDate()); // Fallback
    }
    
    return `${base}?${params.toString()}`;
  }, [activeTab, dateMode, customDate, startDate, endDate]);

  // SWR 1: Data Broker EOD (Berdasarkan Rentang Tanggal)
  const { data: rawBroker, error: errBroker, isLoading: loadBroker } = useSWR(brokerUrl, fetchBrokerSummary, { refreshInterval: 15000, dedupingInterval: 2000 });

  // SWR 2: Data Top Stocks (Tetap Live tanpa filter tanggal untuk kebutuhan Top Stock)
  const { data: rawStocks, error: errStocks, isLoading: loadStocks } = useSWR(activeTab === "Top Stock" ? 'top-stocks-split' : null, fetchTopStocks, { refreshInterval: 15000, dedupingInterval: 2000 });

  // SWR 3: SMART POOL ENGINE (Untuk Modal Broker Profiler)
  const { data: smartPool } = useSWR(
    `smart-pool-symbols-topbroker`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g, l] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_loser', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      symSet.add(simulatedMarketSymbol);
      symSet.add("BBCA"); symSet.add("BBRI"); symSet.add("BMRI"); symSet.add("BBNI"); 
      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      return Array.from(symSet).slice(0, 40); 
    },
    { dedupingInterval: 60000 } 
  );

  // SWR 4: CROSS-FETCH DATA UNTUK MODAL DENGAN RENTANG TANGGAL
  const crossScanKey = modalData?.isOpen && smartPool ? `cross-scan-topbroker-${modalData.brokerCode}-${dateMode}-${customDate}-${startDate}-${endDate}` : null;
  const { data: crossActivity, isLoading: isScanning } = useSWR(
    crossScanKey,
    async () => {
      if (!smartPool || !modalData) return [];
      const promises = smartPool.map(sym => {
        
        // FIX ERROR: Mengganti 'let url' menjadi 'const url'
        const url = `https://api.goapi.io/stock/idx/${sym}/broker_summary`;
        const params = new URLSearchParams();
        params.append('investor', 'ALL');
        if (dateMode === 'single' && customDate) params.append('date', customDate);
        else if (dateMode === 'range' && startDate && endDate) {
          params.append('from', startDate);
          params.append('to', endDate);
        } else {
          params.append('date', getEffectiveDate());
        }

        return fetch(`${url}?${params.toString()}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }})
          .then(res => res.json())
          .then(res => ({ symbol: sym, data: res.data?.results || [] }))
          .catch(() => ({ symbol: sym, data: [] }));
      });
      
      const results = await Promise.all(promises);
      const activities: StockActivity[] = [];
      
      results.forEach(res => {
        let bVal = 0, sVal = 0, avg = 0; 
        res.data.forEach((i: GoApiBrokerItem) => {
          const code = i.broker?.code || i.code || "-";
          if (code === modalData.brokerCode) {
            if (i.side === "BUY") { bVal += i.value; avg = i.avg || 0; }
            else { sVal += i.value; avg = i.avg || 0; }
          }
        });
        
        const nVal = bVal - sVal;
        if (bVal > 0 || sVal > 0) {
          const companyInfo = getCompany(res.symbol);
          activities.push({
            symbol: res.symbol,
            name: companyInfo?.name || `PT ${res.symbol} Tbk.`,
            buyVal: bVal,
            sellVal: sVal,
            netVal: nVal,
            avgPrice: avg
          });
        }
      });
      return activities;
    },
    { dedupingInterval: 30000 }
  );

  // KALKULASI BROKER SUMMARY TABEL
  const brokerList = useMemo(() => {
    if (!rawBroker) return [];
    const map: Record<string, BrokerAggregated> = {};

    rawBroker.forEach(item => {
      const code = item.broker?.code || item.code || "-";
      if (!map[code]) map[code] = { code, name: item.broker?.name || "-", investor: item.investor || "LOCAL", tVal: 0, nVal: 0, bVal: 0, sVal: 0, tLot: 0, avgBuy: 0, avgSell: 0 };
      
      if (item.side === "BUY") { 
        map[code].bVal += item.value; 
        map[code].tLot += item.lot; 
        map[code].avgBuy = item.avg || 0; 
      } else if (item.side === "SELL") { 
        map[code].sVal += item.value; 
        map[code].tLot += item.lot; 
        map[code].avgSell = item.avg || 0; 
      }
      
      map[code].tVal = map[code].bVal + map[code].sVal;
      map[code].nVal = map[code].bVal - map[code].sVal;
    });

    return Object.values(map).sort((a, b) => b.tVal - a.tVal);
  }, [rawBroker]);

  // HELPER UNTUK TAMPILAN TANGGAL DI TOOLBAR
  const displayStart = dateMode === 'single' ? customDate || getEffectiveDate() : startDate;
  const displayEnd = dateMode === 'single' ? customDate || getEffectiveDate() : endDate;

  return (
    <>
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-lg flex flex-col h-full overflow-hidden shadow-lg text-[10px] relative w-full">
        
        {/* HEADER TABS */}
        <div className="flex bg-[#121212] border-b border-[#2d2d2d] shrink-0 pt-2 px-2 gap-1 justify-between items-end">
          <div className="flex gap-1">
            <button 
              onClick={() => setActiveTab("Top Broker")}
              className={`px-4 py-2 text-[11px] font-bold rounded-t-md transition-all ${activeTab === "Top Broker" ? "bg-[#1e1e1e] text-white border-t-2 border-[#10b981]" : "text-neutral-500 hover:text-neutral-300"}`}
            >
              Top Broker
            </button>
            <button 
              onClick={() => setActiveTab("Top Stock")}
              className={`px-4 py-2 text-[11px] font-bold rounded-t-md transition-all ${activeTab === "Top Stock" ? "bg-[#1e1e1e] text-white border-t-2 border-[#10b981]" : "text-neutral-500 hover:text-neutral-300"}`}
            >
              Top Stock
            </button>
          </div>
        </div>

        {/* TOOLBAR FILTER */}
        <div className="p-2 border-b border-[#2d2d2d] flex justify-between items-center bg-[#121212] shrink-0">
          <div className="flex items-center space-x-2 text-neutral-400">
             <span className="text-[11px] font-semibold text-neutral-300 ml-1">{displayStart}</span>
             {dateMode === 'range' && (
               <>
                 <span className="mx-1">→</span>
                 <span className="text-[11px] font-semibold text-neutral-300">{displayEnd}</span>
               </>
             )}
             <Calendar size={13} className="ml-2 cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* RENDER TAB 1: TOP BROKER LIST VIEW */}
        {activeTab === "Top Broker" && (
          <>
            <div className="grid grid-cols-[30px_50px_2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 bg-[#121212] border-b border-[#2d2d2d] font-bold text-neutral-500 shrink-0 text-right uppercase tracking-wider text-[9px]">
              <div className="text-left">#</div>
              <div className="text-left flex items-center gap-1">Code <Info size={10}/></div>
              <div className="text-left">Sekuritas</div>
              <div className="text-white flex items-center justify-end gap-1">◆ T.val</div>
              <div>N.val</div>
              <div>B.val</div>
              <div>S.val</div>
              <div>T.vol</div>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scrollbar p-1 pb-10 bg-[#121212]">
              {loadBroker ? (
                <div className="flex justify-center h-full text-[#10b981] animate-pulse items-center">Menghitung Kalkulasi Broker...</div>
              ) : errBroker ? (
                <div className="flex justify-center h-full text-[#ef4444] items-center">{errBroker.message}</div>
              ) : brokerList.length === 0 ? (
                <div className="flex justify-center h-full text-neutral-500 items-center">Data Broker Belum Tersedia.</div>
              ) : (
                brokerList.map((row: BrokerAggregated, idx: number) => ( 
                  <div 
                    key={idx} 
                    className="grid grid-cols-[30px_50px_2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-2 py-1.5 hover:bg-[#1e1e1e] rounded text-right tabular-nums text-neutral-300 border-b border-[#2d2d2d]/30 items-center cursor-pointer group"
                    onClick={() => setModalData({
                       isOpen: true,
                       brokerCode: row.code,
                       brokerName: row.name,
                       investorType: row.investor,
                       totalNetVal: row.nVal,
                       totalNetLot: row.tLot, 
                       avgPrice: row.nVal >= 0 ? row.avgBuy : row.avgSell
                    })}
                  >
                    <div className="text-left text-neutral-600 font-bold group-hover:text-white transition-colors">{idx + 1}</div>
                    <div className={`text-left font-bold ${getBrokerColorClass(row.code, row.investor)}`}>{row.code}</div>
                    <div className="text-left truncate text-neutral-400 pr-2 group-hover:text-white transition-colors" title={row.name}>{row.name}</div>
                    <div className="text-white font-bold">{formatNumber(row.tVal)}</div>
                    <div className={`font-bold ${row.nVal > 0 ? "text-[#10b981]" : row.nVal < 0 ? "text-[#ef4444]" : "text-neutral-500"}`}>{formatNumber(row.nVal)}</div>
                    <div className="text-[#10b981]">{formatNumber(row.bVal)}</div>
                    <div className="text-[#ef4444]">{formatNumber(row.sVal)}</div>
                    <div>{formatNumber(row.tLot)}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* RENDER TAB 2: TOP STOCK SPLIT VIEW (Gainers vs Losers) */}
        {activeTab === "Top Stock" && (
          <>
            <div className="grid grid-cols-2 gap-2 px-2 py-2 bg-[#121212] border-b border-[#2d2d2d] font-bold text-neutral-500 shrink-0 text-right uppercase tracking-wider text-[9px]">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 pr-2 border-r border-[#2d2d2d]">
                 <div className="text-left text-white text-[11px]">Buy (Gainer)</div>
                 <div>Price</div><div>Chg</div><div>%Chg</div><div>Vol</div>
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 pl-2">
                 <div className="text-left text-white text-[11px]">Sell (Loser)</div>
                 <div>Price</div><div>Chg</div><div>%Chg</div><div>Vol</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-1 pb-10 bg-[#121212]">
               {loadStocks ? (
                 <div className="flex justify-center h-full text-[#10b981] animate-pulse items-center">Menyusun Heatmap...</div>
               ) : errStocks ? (
                 <div className="flex justify-center h-full text-[#ef4444] items-center">Gagal memuat Top Stocks</div>
               ) : (
                 <div className="flex h-full">
                   {/* KIRI: GAINERS */}
                   <div className="w-1/2 flex flex-col pr-1 border-r border-[#2d2d2d]">
                     {rawStocks?.gainers.map((row: GoApiStockItem, idx: number) => { 
                       const master = getCompany(row.symbol);
                       const logoUrl = master?.logo || row.company?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`;
                       return (
                         <div key={`g-${idx}`} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 px-1 py-1.5 hover:bg-[#1e1e1e] rounded text-right tabular-nums text-neutral-300 items-center cursor-pointer" onClick={() => setGlobalActiveSymbol(row.symbol)}>
                           <div className="text-left flex items-center gap-1.5 overflow-hidden">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={logoUrl} alt={row.symbol} className="w-4 h-4 rounded-full bg-white object-contain shrink-0" onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }} />
                             <span className="font-bold text-white hover:text-[#10b981] transition-colors">{row.symbol}</span>
                           </div>
                           <div className="text-[#10b981] font-semibold">{row.close.toLocaleString("id-ID")}</div>
                           <div className="text-[#10b981]">{row.change}</div>
                           <div className="text-[#10b981]">+{row.percent.toFixed(1)}%</div>
                           <div>{formatNumber(row.volume)}</div>
                         </div>
                       );
                     })}
                   </div>

                   {/* KANAN: LOSERS */}
                   <div className="w-1/2 flex flex-col pl-1">
                     {rawStocks?.losers.map((row: GoApiStockItem, idx: number) => { 
                       const master = getCompany(row.symbol);
                       const logoUrl = master?.logo || row.company?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`;
                       return (
                         <div key={`l-${idx}`} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 px-1 py-1.5 hover:bg-[#1e1e1e] rounded text-right tabular-nums text-neutral-300 items-center cursor-pointer" onClick={() => setGlobalActiveSymbol(row.symbol)}>
                           <div className="text-left flex items-center gap-1.5 overflow-hidden">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={logoUrl} alt={row.symbol} className="w-4 h-4 rounded-full bg-white object-contain shrink-0" onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }} />
                             <span className="font-bold text-white hover:text-[#ef4444] transition-colors">{row.symbol}</span>
                           </div>
                           <div className="text-[#ef4444] font-semibold">{row.close.toLocaleString("id-ID")}</div>
                           <div className="text-[#ef4444]">{row.change}</div>
                           <div className="text-[#ef4444]">{row.percent.toFixed(1)}%</div>
                           <div>{formatNumber(row.volume)}</div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}
            </div>
          </>
        )}
      </div>

      {/* RENDER MODAL DENGAN SMART POOL DATA */}
      <BrokerDetailModal
        isOpen={modalData?.isOpen || false}
        onClose={() => setModalData(null)}
        brokerCode={modalData?.brokerCode || ""}
        brokerName={modalData?.brokerName || ""}
        investorType={modalData?.investorType || "LOCAL"}
        totalNetVal={modalData?.totalNetVal || 0}
        totalNetLot={modalData?.totalNetLot || 0}
        avgPrice={modalData?.avgPrice || 0}
        activities={crossActivity || []}
        isLoadingData={isScanning}
      />
    </>
  );
}