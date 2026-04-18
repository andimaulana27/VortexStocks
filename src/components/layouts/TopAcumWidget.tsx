// src/components/layouts/TopAcumWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Calendar } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA GOAPI ---
interface GoApiTrendItem { symbol: string; }
interface GoApiPriceItem {
  symbol: string; 
  close: number; 
  change: number; 
  change_pct: number; 
  volume: number;
}
interface GoApiBrokerItem {
  broker?: { code: string; name: string; };
  code?: string;
  side: string;
  lot: number;
  value: number;
  investor: string;
}

export interface TopAcumWidgetProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

// --- TIPE DATA ROW TABLE ---
interface Accumulator {
  code: string;
  netVal: number;
}

interface ScreenerRow {
  symbol: string;
  close: number;
  changePct: number;
  value: number;
  volume: number;
  foreignInTopX: Accumulator[];
  totalForeignAcum: number; 
}

// --- DATA BROKER ASING ---
const FOREIGN_BROKERS = ["AK", "BK", "CS", "CG", "DB", "DX", "FS", "GW", "KZ", "ML", "MS", "RX", "ZP", "YU", "BB"];

// UPDATE KEAMANAN: Fungsi Fetcher khusus melalui Proxy Internal
const proxyFetcher = async (endpoint: string) => {
  const res = await fetch(`/api/market?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) throw new Error('Gagal mengambil data via proxy');
  return res.json();
};

// --- HELPER DATE & FORMATTING ---
const getEffectiveDateAPI = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const formatShort = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

const getDatesInRange = (start: string, end: string) => {
  const dateArray = [];
  const currentDate = new Date(start);
  const stopDate = new Date(end);
  while (currentDate <= stopDate) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
};

export default function TopAcumWidget({ 
  customDate, 
  dateMode = 'single', 
  startDate, 
  endDate 
}: TopAcumWidgetProps) {
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  const apiDate = customDate || getEffectiveDateAPI();

  const displayDate = useMemo(() => {
    if (dateMode === 'range' && startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      const e = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      return `${s} - ${e}`;
    }
    return new Date(apiDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [dateMode, apiDate, startDate, endDate]);

  const [brokerLimit, setBrokerLimit] = useState<number>(10);

  // 1. Fetch Smart Pool
  const { data: smartPool } = useSWR(
    `topacum-screener-pool`,
    async () => {
      const [t, g, l] = await Promise.all([
        proxyFetcher('stock/idx/trending'),
        proxyFetcher('stock/idx/top_gainer'),
        proxyFetcher('stock/idx/top_loser')
      ]);
      const symSet = new Set<string>();
      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      return Array.from(symSet).slice(0, 50); 
    }, { dedupingInterval: 60000 }
  );

  // 2. Fetch Real Prices
  const { data: prices, isLoading: isLoadingPrices } = useSWR(
    smartPool ? `topacum-prices-${smartPool.join(',')}` : null,
    () => proxyFetcher(`stock/idx/prices?symbols=${smartPool?.join(',')}`),
    { refreshInterval: 10000 }
  );

  // 3. Fetch Real Broker Summaries (Mendukung Single & Range)
  const { data: brokerData, isLoading: isLoadingBrokers } = useSWR(
    smartPool ? `topacum-brokers-${smartPool.join(',')}-${dateMode}-${apiDate}-${startDate}-${endDate}` : null,
    async () => {
      if (dateMode === 'single') {
        const promises = smartPool!.map(sym =>
          proxyFetcher(`stock/idx/${sym}/broker_summary?date=${apiDate}&investor=ALL`)
            .then(res => ({ symbol: sym, data: res.data?.results || [] }))
            .catch(() => ({ symbol: sym, data: [] }))
        );
        return await Promise.all(promises);
      } else {
        if (!startDate || !endDate) return [];
        const dates = getDatesInRange(startDate, endDate);

        const promises = smartPool!.map(async (sym) => {
          const datePromises = dates.map(d => 
            proxyFetcher(`stock/idx/${sym}/broker_summary?date=${d}&investor=ALL`)
              .catch(() => ({ data: { results: [] } }))
          );
          
          const dateResults = await Promise.all(datePromises);
          const mergedData: Record<string, GoApiBrokerItem> = {};

          dateResults.forEach(res => {
            if (!res?.data?.results) return;
            res.data.results.forEach((item: GoApiBrokerItem) => {
              const bCode = item.broker?.code || item.code || "-";
              const key = `${bCode}-${item.side}`;
              
              if (!mergedData[key]) {
                mergedData[key] = { ...item };
              } else {
                mergedData[key].value += item.value;
                mergedData[key].lot += item.lot;
              }
            });
          });

          return { symbol: sym, data: Object.values(mergedData) };
        });

        return await Promise.all(promises);
      }
    },
    { dedupingInterval: 60000 }
  );

  // 4. Kalkulasi Data 
  const screenerData: ScreenerRow[] = useMemo(() => {
    if (!prices?.data?.results || !brokerData) return [];
    
    const rows: ScreenerRow[] = [];
    
    prices.data.results.forEach((p: GoApiPriceItem) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bData = brokerData.find((b: any) => b.symbol === p.symbol)?.data || [];
      const brokerNets: Record<string, number> = {};
      
      bData.forEach((item: GoApiBrokerItem) => {
          const code = (item.broker?.code || item.code || "-").toUpperCase();
          if (!brokerNets[code]) brokerNets[code] = 0;
          if (item.side === "BUY") brokerNets[code] += item.value;
          else brokerNets[code] -= item.value;
      });

      const topBuyers = Object.entries(brokerNets)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, netVal]) => netVal > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, brokerLimit); 

      const foreignInTopX: Accumulator[] = [];
      let totalForeignAcum = 0;

      topBuyers.forEach(([code, netVal]) => {
          if (FOREIGN_BROKERS.includes(code)) {
              foreignInTopX.push({ code, netVal });
              totalForeignAcum += netVal;
          }
      });

      if (foreignInTopX.length >= 1 && totalForeignAcum > 0) {
        const vol = p.volume || 0;
        const val = vol * p.close; 

        rows.push({
          symbol: p.symbol, 
          close: p.close, 
          changePct: p.change_pct,
          value: val, 
          volume: vol, 
          foreignInTopX,
          totalForeignAcum
        });
      }
    });

    return rows.sort((a, b) => b.totalForeignAcum - a.totalForeignAcum); 
  }, [prices, brokerData, brokerLimit]);

  const isScanning = isLoadingPrices || isLoadingBrokers;

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">
      
      {/* --- HEADER & FILTER --- */}
      <div className="flex items-center justify-between shrink-0 bg-[#121212] px-1 pt-1">
        
        {/* FILTER TOP BROKER (10, 20, 30) */}
        <div className="flex items-center gap-2 bg-[#1e1e1e] p-1 rounded-lg border border-[#2d2d2d]">
          <span className="text-neutral-500 text-[10px] font-bold px-2 uppercase tracking-wider">Cek Rentang:</span>
          {[10, 20, 30].map(num => (
            <button
              key={num}
              onClick={() => setBrokerLimit(num)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all duration-300 ${
                brokerLimit === num 
                  ? 'bg-[#10b981] text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                  : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[#2d2d2d]'
              }`}
            >
              Top {num} Buyer
            </button>
          ))}
        </div>

        {/* INDIKATOR TANGGAL */}
        <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5">
          <Calendar size={12} className="text-[#10b981]" />
          <span className="text-white text-[11px] font-bold tracking-wider">{displayDate}</span>
        </div>
      </div>

      {/* --- TABEL SCREENER TOP ACUM --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg mt-1">
        
        {/* TABLE HEADERS */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[11px] font-bold text-neutral-500 items-center shrink-0">
          <div>Kode Emiten</div>
          <div>Last Price</div>
          <div className="text-right">Est. Turnover (Value)</div>
          <div className="text-right">Last Volume</div>
          <div className="text-center">Foreign di Top {brokerLimit} Buyer</div>
          <div className="text-right">Net Value Asing</div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          {isScanning && (
             <div className="absolute inset-0 z-10 flex justify-center items-center text-[#ef4444] animate-pulse text-[12px] font-bold bg-[#121212]/80 backdrop-blur-sm">
               Memindai Jejak Akumulasi Asing ({displayDate})...
             </div>
          )}
          
          {screenerData.length === 0 && !isScanning ? (
             <div className="absolute inset-0 z-10 flex justify-center items-center text-neutral-500 text-[12px] font-bold">
               Tidak ada dominasi asing di Top {brokerLimit} Buyer pada periode {displayDate}.
             </div>
          ) : (
            screenerData.map((row: ScreenerRow, idx: number) => {
              const comp = getCompany(row.symbol);
              const isUp = row.changePct >= 0;
              const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";

              return (
                <div 
                  key={idx}
                  onClick={() => setGlobalSymbol(row.symbol)}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr] px-5 py-3.5 items-center text-[12px] tabular-nums hover:bg-[#1e1e1e] cursor-pointer border-b border-[#2d2d2d]/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={comp?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`} alt="" className="w-6 h-6 rounded-full bg-white p-0.5 shadow-sm" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                    <span className="font-extrabold text-white group-hover:text-[#ef4444] transition-colors tracking-wide text-[13px]">{row.symbol}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5 font-bold">
                    <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                    <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                  </div>

                  <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.value)}</div>
                  
                  <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                  
                  {/* Badge Broker Asing */}
                  <div className="flex justify-center gap-1.5 flex-wrap">
                    {row.foreignInTopX.slice(0, 5).map((b, i) => (
                      <span key={i} className={`px-2 py-0.5 border text-[9px] font-black rounded flex gap-1 items-center bg-[#ef4444]/10 border-[#ef4444]/40 text-[#ef4444]`}>
                        {b.code} <span className="opacity-70 font-semibold text-[8px]">{formatShort(b.netVal)}</span>
                      </span>
                    ))}
                    {row.foreignInTopX.length > 5 && (
                      <span className="px-1.5 py-0.5 border text-[9px] font-black rounded flex items-center bg-[#2d2d2d] border-[#3e3e3e] text-neutral-400">
                        +{row.foreignInTopX.length - 5}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right font-black tracking-wide text-[#10b981]">
                    +{formatShort(row.totalForeignAcum)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}