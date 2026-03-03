// src/components/layouts/AnomaliBrokerWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Calendar, Filter, AlertTriangle } from 'lucide-react';

// --- TIPE DATA ---
interface GoApiTrendItem { 
  symbol: string; 
}

interface GoApiPriceItem {
  symbol: string; 
  close: number; 
  change: number; 
  change_pct: number; 
  volume: number;
}

interface ScreenerRow {
  symbol: string;
  close: number;
  changePct: number;
  value: number;
  volume: number;
  anomalyBrokers: string[];
  netForeign: number;
}

// --- DATA SIMULASI BROKER ANOMALI ---
// Kode broker fiktif atau jarang aktif yang dianggap anomali oleh sistem
const ANOMALY_CODES = ["TX", "QA", "ZZ", "WE", "OY", "UU", "VV", "XX", "RY", "QW"];
const TIME_PRESETS = ["Hari Ini", "Kemarin", "1 Minggu", "1 Bulan"];

// --- HELPER FORMATTING ---
const formatShort = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

export default function AnomaliBrokerWidget() {
  const [activeTimeframe, setActiveTimeframe] = useState("Hari Ini");
  const [dateRange] = useState("Feb 13, 2026 - Feb 13, 2026");

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  // 1. Fetch Smart Pool (Top Stocks)
  const { data: smartPool } = useSWR(
    `anomali-screener-pool`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g, l] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_loser', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      return Array.from(symSet).slice(0, 50); 
    }, { dedupingInterval: 60000 }
  );

  // 2. Fetch Real Prices
  const { data: prices, isLoading } = useSWR(
    smartPool ? `anomali-screener-prices-${smartPool.join(',')}` : null,
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${smartPool?.join(',')}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 10000 }
  );

  // 3. Kalkulasi & Deteksi Anomali
  const screenerData: ScreenerRow[] = useMemo(() => {
    if (!prices?.data?.results) return [];
    
    const rows: ScreenerRow[] = [];
    
    prices.data.results.forEach((p: GoApiPriceItem) => {
      let seed = 0; 
      for(let i=0; i<p.symbol.length; i++) seed += p.symbol.charCodeAt(i);
      
      // LOGIKA ANOMALI: Menggunakan seed agar hasilnya konsisten per saham (sekitar 40% saham terdeteksi)
      const hasAnomaly = seed % 5 === 0 || seed % 3 === 0; 
      
      if (hasAnomaly) {
        const vol = p.volume || 0;
        const val = vol * p.close; 
        
        // Menentukan berapa banyak broker anomali (1 sampai 3 broker)
        const numAnomalies = (seed % 3) + 1; 
        const anomalyBrokers: string[] = [];
        for(let j=0; j<numAnomalies; j++) {
            anomalyBrokers.push(ANOMALY_CODES[(seed + j) % ANOMALY_CODES.length]);
        }
        
        // Simulasi Net Smart Money
        const isUp = p.change >= 0;
        const rawNet = val * ((seed % 20) / 100); 
        const netForeign = isUp ? rawNet : -rawNet;

        rows.push({
          symbol: p.symbol, 
          close: p.close, 
          changePct: p.change_pct,
          value: val, 
          volume: vol, 
          anomalyBrokers,
          netForeign: netForeign
        });
      }
    });

    // Urutkan berdasarkan Value transaksi terbesar
    return rows.sort((a, b) => b.value - a.value); 
  }, [prices]);

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">
      
      {/* --- HEADER FILTER (Identik dengan Volume & Smart Money Tab) --- */}
      <div className="flex flex-col gap-3 shrink-0 bg-[#121212] px-1 pt-1">
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="flex items-center justify-center border border-[#2d2d2d] rounded-full w-[30px] h-[30px] mr-1">
              <Filter size={13} className="text-[#ec4899]" />
            </span>
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mr-2">Waktu:</span>
            <div className="flex gap-1.5">
              {TIME_PRESETS.map(tf => (
                <button 
                  key={tf} onClick={() => setActiveTimeframe(tf)} 
                  className={`px-4 py-1.5 text-[10px] font-bold border rounded-full transition-all ${
                    activeTimeframe === tf ? 'border-[#ec4899] text-[#ec4899] bg-[#ec4899]/10 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            
            <div className="ml-4 flex items-center gap-2 bg-[#ec4899]/10 border border-[#ec4899]/30 px-3 py-1.5 rounded-full">
              <AlertTriangle size={12} className="text-[#ec4899]" />
              <span className="text-[10px] font-bold text-[#ec4899] uppercase tracking-widest">
                Mendeteksi Broker Misterius di Top 10 Buyers
              </span>
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-1.5 bg-[#121212] border border-[#2d2d2d] rounded-full text-[10px] font-bold text-neutral-400 hover:text-white hover:border-[#3e3e3e] transition-colors">
            <Calendar size={13} className="text-neutral-500" /> {dateRange}
          </button>
        </div>
      </div>

      {/* --- TABEL SCREENER ANOMALI --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg mt-1">
        
        {/* Header Tabel */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[11px] font-bold text-neutral-500 items-center shrink-0">
          <div>Kode Emiten</div>
          <div>Last Price</div>
          <div className="text-right">Turnover (Value)</div>
          <div className="text-right">Total Volume</div>
          <div className="text-right">Broker Anomali</div>
          <div className="text-right">Net Smart Money</div>
        </div>

        {/* Body Tabel */}
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          {isLoading && (
             <div className="absolute inset-0 z-10 flex justify-center items-center text-[#ec4899] animate-pulse text-[12px] font-bold bg-[#121212]/80">
               Memindai Aktivitas Anomali...
             </div>
          )}
          
          {screenerData.length === 0 && !isLoading ? (
             <div className="absolute inset-0 z-10 flex justify-center items-center text-neutral-500 text-[12px] font-bold">
               Tidak ada aktivitas broker anomali yang terdeteksi.
             </div>
          ) : (
            screenerData.map((row: ScreenerRow, idx: number) => {
              const comp = getCompany(row.symbol);
              const isUp = row.changePct >= 0;
              const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";
              const colorNet = row.netForeign >= 0 ? "text-[#10b981]" : "text-[#ef4444]";

              return (
                <div 
                  key={idx}
                  onClick={() => setGlobalSymbol(row.symbol)}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3.5 items-center text-[12px] tabular-nums hover:bg-[#1e1e1e] cursor-pointer border-b border-[#2d2d2d]/50 transition-colors group"
                >
                  {/* Symbol & Logo */}
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={comp?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`} alt="" className="w-6 h-6 rounded-full bg-white p-0.5 shadow-sm" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                    <span className="font-extrabold text-white group-hover:text-[#ec4899] transition-colors tracking-wide text-[13px]">{row.symbol}</span>
                  </div>
                  
                  {/* Price & % */}
                  <div className="flex flex-col gap-0.5 font-bold">
                    <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                    <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                  </div>

                  {/* Value */}
                  <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.value)}</div>
                  
                  {/* Volume */}
                  <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                  
                  {/* Anomaly Brokers (Pills/Badges) */}
                  <div className="flex justify-end gap-1 flex-wrap">
                    {row.anomalyBrokers.map((b, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-[#ec4899]/20 border border-[#ec4899]/50 text-[#ec4899] text-[9px] font-black rounded">
                        {b}
                      </span>
                    ))}
                  </div>
                  
                  {/* Net Foreign / Smart Money */}
                  <div className={`text-right font-black tracking-wide ${colorNet}`}>
                    {row.netForeign > 0 ? '+' : ''}{formatShort(row.netForeign)}
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