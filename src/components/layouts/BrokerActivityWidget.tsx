// src/components/layouts/BrokerActivityWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Search, Calendar } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// DEFINISI TIPE DATA DARI GOAPI
interface GoApiTrendItem { symbol: string; }
interface GoApiBrokerItem {
  broker?: { code: string; name: string; }; code?: string; side: string; lot: number; value: number; investor?: string; avg?: number;
}
interface StockActivity {
  symbol: string; name: string; buyVal: number; buyLot: number; buyAvg: number; sellVal: number; sellLot: number; sellAvg: number; netVal: number;
}

export interface BrokerActivityWidgetProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

// Helper Tanggal Default
const getEffectiveDateAPI = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const formatValue = (num: number) => {
  if (!num) return "-";
  const abs = Math.abs(num);
  if (abs >= 1e9) return (abs / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (abs / 1e3).toFixed(1) + 'K';
  return num.toString();
};

// Helper: Tanggal dalam range (skip weekend)
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

// UPDATE KEAMANAN: Fungsi Fetcher khusus melalui Proxy Internal
const proxyFetcher = async (endpoint: string) => {
  const res = await fetch(`/api/market?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) throw new Error('Gagal mengambil data via proxy');
  return res.json();
};

const POPULAR_BROKERS = [
  { code: "YP", name: "MIRAE ASSET" }, { code: "CC", name: "MANDIRI" }, { code: "BK", name: "J.P. MORGAN" },
  { code: "AK", name: "UBS" }, { code: "ZP", name: "MAYBANK" }, { code: "NI", name: "BNI" },
  { code: "OD", name: "BRI DANAREKSA" }, { code: "PD", name: "INDO PREMIER" }, { code: "XC", name: "AJAIB" },
  { code: "XL", name: "STOCKBIT" }, { code: "CS", name: "CREDIT SUISSE" }, { code: "RX", name: "MACQUARIE" },
  { code: "MG", name: "SEMESETA INDOVEST" }, { code: "GR", name: "PANIN" }, { code: "CP", name: "VALBURY" }
];

export default function BrokerActivityWidget({ 
  customDate,
  dateMode = 'single',
  startDate,
  endDate
}: BrokerActivityWidgetProps) {
  const [brokerCode, setBrokerCode] = useState("YP"); 
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  
  const apiDate = customDate || getEffectiveDateAPI(); 

  // Format UI Tanggal
  const displayDate = useMemo(() => {
    if (dateMode === 'range' && startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      return `${s} - ${e}`;
    }
    return new Date(apiDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [dateMode, apiDate, startDate, endDate]);

  const { data: smartPool } = useSWR(
    `activity-smart-pool-symbols`,
    async () => {
      // Menggunakan Proxy Fetcher
      const [t, g, l] = await Promise.all([
        proxyFetcher('stock/idx/trending'),
        proxyFetcher('stock/idx/top_gainer'),
        proxyFetcher('stock/idx/top_loser')
      ]);
      const symSet = new Set<string>();
      
      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      return Array.from(symSet).slice(0, 40); 
    },
    { dedupingInterval: 60000 }
  );

  const { data: activities, isLoading } = useSWR(
    brokerCode && brokerCode.length >= 2 && smartPool ? `scan-broker-${brokerCode}-${dateMode}-${apiDate}-${startDate}-${endDate}` : null,
    async () => {
      if (!smartPool) return [];

      if (dateMode === 'single') {
        // LOGIKA SINGLE DATE
        const promises = smartPool.map(sym =>
          proxyFetcher(`stock/idx/${sym}/broker_summary?date=${apiDate}&investor=ALL`)
            .then(res => ({ symbol: sym, data: res.data?.results || [] }))
            .catch(() => ({ symbol: sym, data: [] })) 
        );
        
        const results = await Promise.all(promises);
        const acts: StockActivity[] = [];
        
        results.forEach(res => {
          let bVal = 0, sVal = 0, bLot = 0, sLot = 0; 
          
          res.data.forEach((i: GoApiBrokerItem) => {
            const code = i.broker?.code || i.code || "-";
            if (code.toUpperCase() === brokerCode.toUpperCase()) {
              if (i.side === "BUY") { bVal += i.value; bLot += i.lot; } 
              else { sVal += i.value; sLot += i.lot; }
            }
          });
          
          const exactBuyAvg = bLot > 0 ? (bVal / (bLot * 100)) : 0;
          const exactSellAvg = sLot > 0 ? (sVal / (sLot * 100)) : 0;
          const nVal = bVal - sVal;
  
          if (bVal > 0 || sVal > 0) {
            acts.push({
              symbol: res.symbol,
              name: getCompany(res.symbol)?.name || `PT ${res.symbol} Tbk.`,
              buyVal: bVal, buyLot: bLot, buyAvg: exactBuyAvg,
              sellVal: sVal, sellLot: sLot, sellAvg: exactSellAvg,
              netVal: nVal
            });
          }
        });
        return acts.sort((a, b) => Math.abs(b.netVal) - Math.abs(a.netVal));

      } else {
        // LOGIKA DATE RANGE
        if (!startDate || !endDate) return [];
        const dates = getDatesInRange(startDate, endDate);

        // Map setiap saham
        const promises = smartPool.map(async (sym) => {
          // Untuk setiap saham, ambil data dari semua tanggal dalam range
          const datePromises = dates.map(d => 
            proxyFetcher(`stock/idx/${sym}/broker_summary?date=${d}&investor=ALL`)
              .catch(() => ({ data: { results: [] } }))
          );
          
          const dateResults = await Promise.all(datePromises);
          
          let bVal = 0, sVal = 0, bLot = 0, sLot = 0;
          
          // Akumulasikan semua data dari berbagai tanggal untuk saham ini
          dateResults.forEach(res => {
            if (!res?.data?.results) return;
            res.data.results.forEach((i: GoApiBrokerItem) => {
              const code = i.broker?.code || i.code || "-";
              if (code.toUpperCase() === brokerCode.toUpperCase()) {
                if (i.side === "BUY") { bVal += i.value; bLot += i.lot; } 
                else { sVal += i.value; sLot += i.lot; }
              }
            });
          });

          const exactBuyAvg = bLot > 0 ? (bVal / (bLot * 100)) : 0;
          const exactSellAvg = sLot > 0 ? (sVal / (sLot * 100)) : 0;
          const nVal = bVal - sVal;

          if (bVal > 0 || sVal > 0) {
            return {
              symbol: sym,
              name: getCompany(sym)?.name || `PT ${sym} Tbk.`,
              buyVal: bVal, buyLot: bLot, buyAvg: exactBuyAvg,
              sellVal: sVal, sellLot: sLot, sellAvg: exactSellAvg,
              netVal: nVal
            } as StockActivity;
          }
          return null;
        });

        const results = await Promise.all(promises);
        // Filter null dan urutkan berdasarkan nominal terbesar
        const finalActs = results.filter((item): item is StockActivity => item !== null);
        return finalActs.sort((a, b) => Math.abs(b.netVal) - Math.abs(a.netVal));
      }
    },
    { dedupingInterval: 30000 }
  );

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col h-full overflow-hidden shadow-lg w-full">
      <div className="p-3 border-b border-[#2d2d2d] flex justify-between items-center shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-white text-[12px] flex items-center gap-1.5">
            Broker Activity
          </span>
          <span className="text-[9px] text-neutral-500 font-semibold flex items-center gap-1">
            <Calendar size={10} /> {displayDate}
          </span>
        </div>
        
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2 text-neutral-500 pointer-events-none" />
          <input 
            list="broker-list" type="text" maxLength={2} value={brokerCode}
            onChange={(e) => setBrokerCode(e.target.value.toUpperCase())}
            placeholder="Ex: YP"
            className="w-[70px] bg-[#1e1e1e] border border-[#2d2d2d] rounded text-white text-[11px] font-bold pl-6 pr-2 py-1 outline-none focus:border-[#3b82f6] uppercase tracking-wider"
          />
          <datalist id="broker-list">
            {POPULAR_BROKERS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
          </datalist>
        </div>
      </div>

      <div className="flex-1 overflow-auto hide-scrollbar relative">
        <div className="min-w-[480px]"> 
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.2fr] w-full px-2 py-2 bg-[#1e1e1e]/50 border-b border-[#2d2d2d] text-[9px] font-bold text-neutral-400 shrink-0 uppercase tracking-wider items-center">
            <div className="text-left pl-1">Sym</div>
            <div className="text-right text-[#10b981]">B.Val</div>
            <div className="text-right text-[#10b981]">B.Lot</div>
            <div className="text-right text-[#10b981]">B.Avg</div>
            <div className="text-right text-[#ef4444]">S.Val</div>
            <div className="text-right text-[#ef4444]">S.Lot</div>
            <div className="text-right text-[#ef4444]">S.Avg</div>
            <div className="text-right pr-1">Net Val</div>
          </div>

          <div className="relative pb-2">
            {isLoading && (
               <div className="absolute inset-0 flex justify-center items-center text-[#3b82f6] animate-pulse text-[10px] font-bold bg-[#121212]/80 backdrop-blur-sm z-10 min-h-[100px]">
                 Memindai Market...
               </div>
            )}

            {activities && activities.length > 0 ? (
              <div className="flex flex-col">
                {activities.map((item, idx) => (
                  <div 
                    key={idx} onClick={() => setGlobalSymbol(item.symbol)}
                    className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.2fr] w-full px-2 py-2.5 items-center text-[10px] tabular-nums border-b border-[#2d2d2d]/30 hover:bg-[#1e1e1e] cursor-pointer transition-colors"
                  >
                    <div className="font-black text-white hover:text-[#3b82f6] transition-colors pl-1">{item.symbol}</div>
                    <div className="text-right font-semibold text-[#10b981]">{formatValue(item.buyVal)}</div>
                    <div className="text-right font-medium text-[#10b981]">{formatValue(item.buyLot)}</div>
                    <div className="text-right font-bold text-[#10b981] bg-[#10b981]/10 rounded px-1 ml-auto">{item.buyAvg > 0 ? Math.round(item.buyAvg) : "-"}</div>
                    <div className="text-right font-semibold text-[#ef4444]">{formatValue(item.sellVal)}</div>
                    <div className="text-right font-medium text-[#ef4444]">{formatValue(item.sellLot)}</div>
                    <div className="text-right font-bold text-[#ef4444] bg-[#ef4444]/10 rounded px-1 ml-auto">{item.sellAvg > 0 ? Math.round(item.sellAvg) : "-"}</div>
                    <div className={`text-right font-black pr-1 ${item.netVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {item.netVal > 0 ? '+' : ''}{formatValue(item.netVal)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isLoading && <div className="flex items-center justify-center h-20 text-neutral-500 text-[10px]">Belum ada aktivitas transaksi.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}