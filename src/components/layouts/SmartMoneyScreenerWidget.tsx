// src/components/layouts/SmartMoneyScreenerWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Calendar, Filter } from 'lucide-react';

// --- TIPE DATA GOAPI ---
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

// --- TIPE DATA ROW TABLE ---
interface ScreenerRow {
  symbol: string;
  close: number;
  changePct: number;
  value: number;
  volume: number;
  freq: number;
  netForeign: number;
}

// --- DATA BROKER (Disesuaikan dengan standar pasar) ---
const FOREIGN_BROKERS = ["AK", "BK", "CS", "CG", "DB", "DX", "FS", "GW", "KZ", "ML", "MS", "RX", "ZP", "YU", "BB"];
const LOCAL_BROKERS = ["YP", "PD", "XC", "XL", "GR", "CP", "KK", "SQ", "SS", "DR", "BQ", "TP", "XA", "HD", "AI"];
const BUMN_BROKERS = ["CC", "NI", "OD", "BM", "BR"];
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

export default function SmartMoneyScreenerWidget() {
  const [activeTimeframe, setActiveTimeframe] = useState("Hari Ini");
  const [dateRange] = useState("Feb 13, 2026 - Feb 13, 2026");

  // State Multiselect Broker
  const [selForeign, setSelForeign] = useState<string[]>(["AK", "ZP", "BK"]);
  const [selLocal, setSelLocal] = useState<string[]>(["YP", "PD"]);
  const [selBumn, setSelBumn] = useState<string[]>(["CC", "NI"]);

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  const toggleBroker = (code: string, type: 'foreign' | 'local' | 'bumn') => {
    if (type === 'foreign') {
      setSelForeign(prev => prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]);
    } else if (type === 'local') {
      setSelLocal(prev => prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]);
    } else {
      setSelBumn(prev => prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]);
    }
  };

  // 1. Fetch Smart Pool (Top Stocks)
  const { data: smartPool } = useSWR(
    `sm-screener-pool`,
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
    smartPool ? `sm-screener-prices-${smartPool.join(',')}` : null,
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${smartPool?.join(',')}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 10000 }
  );

  // 3. Kalkulasi Data Table (Simulasi Freq & Net Smart Money based on Volume)
  const screenerData: ScreenerRow[] = useMemo(() => {
    if (!prices?.data?.results) return [];
    
    return prices.data.results.map((p: GoApiPriceItem): ScreenerRow => {
      const vol = p.volume || 0;
      const val = vol * p.close; 
      
      let seed = 0; for(let i=0; i<p.symbol.length; i++) seed += p.symbol.charCodeAt(i);
      const freq = Math.floor(vol / ((seed % 50) + 10)); 
      
      const isUp = p.change >= 0;
      const rawNet = val * ((seed % 15) / 100); 
      const netForeign = isUp ? rawNet : -rawNet;

      return {
        symbol: p.symbol, 
        close: p.close, 
        changePct: p.change_pct,
        value: val, 
        volume: vol, 
        freq: freq,
        netForeign: netForeign
      };
    }).sort((a: ScreenerRow, b: ScreenerRow) => b.value - a.value); 
  }, [prices]);

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">
      
      {/* --- HEADER FILTER (Layout Identik dengan VolumeScreenerWidget) --- */}
      <div className="flex flex-col gap-3 shrink-0 bg-[#121212] px-1 pt-1">
        
        {/* Row 1: Timeframe & Calendar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="flex items-center justify-center border border-[#2d2d2d] rounded-full w-[30px] h-[30px] mr-1">
              <Filter size={13} className="text-[#3b82f6]" />
            </span>
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mr-2">Waktu:</span>
            <div className="flex gap-1.5">
              {TIME_PRESETS.map(tf => (
                <button 
                  key={tf} onClick={() => setActiveTimeframe(tf)} 
                  className={`px-4 py-1.5 text-[10px] font-bold border rounded-full transition-all ${
                    activeTimeframe === tf ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-1.5 bg-[#121212] border border-[#2d2d2d] rounded-full text-[10px] font-bold text-neutral-400 hover:text-white hover:border-[#3e3e3e] transition-colors">
            <Calendar size={13} className="text-neutral-500" /> {dateRange}
          </button>
        </div>

        {/* Row 2: Sub-Filters (Broker Selection Horizontal Scroll) */}
        <div className="flex items-center gap-5 pt-1 overflow-x-auto hide-scrollbar pb-1">
          
          {/* Asing (Merah) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest">Asing:</span>
            <div className="flex gap-1.5">
              {FOREIGN_BROKERS.map(b => (
                <button key={`f-${b}`} onClick={() => toggleBroker(b, 'foreign')} className={`w-7 h-7 shrink-0 rounded-full text-[9px] font-black flex items-center justify-center transition-all duration-300 ${selForeign.includes(b) ? 'bg-[#ef4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] border-transparent scale-105' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#ef4444] hover:text-[#ef4444]'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-[#2d2d2d] shrink-0"></div>

          {/* Lokal (Ungu) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-bold text-[#a855f7] uppercase tracking-widest">Lokal:</span>
            <div className="flex gap-1.5">
              {LOCAL_BROKERS.map(b => (
                <button key={`l-${b}`} onClick={() => toggleBroker(b, 'local')} className={`w-7 h-7 shrink-0 rounded-full text-[9px] font-black flex items-center justify-center transition-all duration-300 ${selLocal.includes(b) ? 'bg-[#a855f7] text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] border-transparent scale-105' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#a855f7] hover:text-[#a855f7]'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-[#2d2d2d] shrink-0"></div>

          {/* BUMN (Hijau) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">BUMN:</span>
            <div className="flex gap-1.5">
              {BUMN_BROKERS.map(b => (
                <button key={`b-${b}`} onClick={() => toggleBroker(b, 'bumn')} className={`w-7 h-7 shrink-0 rounded-full text-[9px] font-black flex items-center justify-center transition-all duration-300 ${selBumn.includes(b) ? 'bg-[#10b981] text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] border-transparent scale-105' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#10b981] hover:text-[#10b981]'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* --- TABEL SCREENER (Identik dengan VolumeScreenerWidget) --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg mt-1">
        
        {/* Header Tabel */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[11px] font-bold text-neutral-500 items-center shrink-0">
          <div>Kode Emiten</div>
          <div>Last Price</div>
          <div className="text-right">Turnover (Value)</div>
          <div className="text-right">Total Volume</div>
          <div className="text-right">Freq</div>
          <div className="text-right">Net Smart Money</div>
        </div>

        {/* Body Tabel */}
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          {isLoading && (
             <div className="absolute inset-0 z-10 flex justify-center items-center text-[#10b981] animate-pulse text-[12px] font-bold bg-[#121212]/80">
               Memindai Broker Summary...
             </div>
          )}
          
          {screenerData.map((row: ScreenerRow, idx: number) => {
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
                  <span className="font-extrabold text-white group-hover:text-[#3b82f6] transition-colors tracking-wide text-[13px]">{row.symbol}</span>
                </div>
                
                {/* Price & % (Format Dua Baris seperti VolumeScreener) */}
                <div className="flex flex-col gap-0.5 font-bold">
                  <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                </div>

                {/* Value (Turnover) */}
                <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.value)}</div>
                
                {/* Volume */}
                <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                
                {/* Freq */}
                <div className="text-right text-neutral-400 font-medium">{formatShort(row.freq)}</div>
                
                {/* Net Foreign / Smart Money */}
                <div className={`text-right font-black tracking-wide ${colorNet}`}>
                  {row.netForeign > 0 ? '+' : ''}{formatShort(row.netForeign)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}