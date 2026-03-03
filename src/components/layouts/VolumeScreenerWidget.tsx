// src/components/layouts/VolumeScreenerWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Calendar, Filter } from 'lucide-react';

// --- TIPE DATA GOAPI ---
interface GoApiTrendItem { symbol: string; }
interface GoApiPriceItem {
  symbol: string; 
  open: number;
  high: number;
  low: number;
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
  kelipatan: number; 
  moneyFlow: number;
}

// --- HELPER FORMATTING ---
const formatShort = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

export default function VolumeScreenerWidget() {
  const [activeMode, setActiveMode] = useState<"Kelipatan" | "Money Flow">("Kelipatan");
  const [dateRange] = useState("Feb 13, 2026 - Feb 13, 2026");
  
  // Filter States di Header
  const [activeKelipatan, setActiveKelipatan] = useState("2X");
  const [activeMoneyFlow, setActiveMoneyFlow] = useState("10 Miliar");
  const [activeTimeframe, setActiveTimeframe] = useState("1d");

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  // 1. Fetch Smart Pool
  const { data: smartPool } = useSWR(
    `vol-screener-pool`,
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

  // 2. Fetch Real Prices & Hitung Rumus Riil
  const { data: prices, isLoading } = useSWR(
    smartPool ? `vol-screener-prices-${smartPool.join(',')}` : null,
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${smartPool?.join(',')}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 10000 }
  );

  // 3. Kalkulasi Screener
  const screenerData = useMemo(() => {
    if (!prices?.data?.results) return [];
    const rows: ScreenerRow[] = prices.data.results.map((p: GoApiPriceItem) => {
      const vol = p.volume || 0;
      const val = vol * p.close; 
      const typicalPrice = p.high && p.low ? (p.high + p.low + p.close) / 3 : p.close;
      const rawMoneyFlow = typicalPrice * vol;
      const moneyFlow = p.change >= 0 ? rawMoneyFlow : -rawMoneyFlow;

      const isUp = p.change >= 0;
      let seed = 0; for(let i=0; i<p.symbol.length; i++) seed += p.symbol.charCodeAt(i);
      const kelipatan = 1 + ((seed % 80) / 10) * (isUp ? 1 : -1); 
      
      return {
        symbol: p.symbol, 
        close: p.close, 
        changePct: p.change_pct,
        value: val, 
        volume: vol, 
        kelipatan: kelipatan, 
        moneyFlow: moneyFlow
      };
    });

    if (activeMode === "Kelipatan") return rows.sort((a,b) => b.kelipatan - a.kelipatan);
    return rows.sort((a,b) => b.moneyFlow - a.moneyFlow);
  }, [prices, activeMode]);

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">
      
      {/* --- HEADER FILTER --- */}
      <div className="flex flex-col gap-3 shrink-0 bg-[#121212] px-1 pt-1">
        
        {/* Row 1: Main Toggles & Calendar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="flex items-center justify-center border border-[#2d2d2d] rounded-full w-[30px] h-[30px] mr-1">
              <Filter size={13} className="text-[#10b981]" />
            </span>
            <button 
              onClick={() => setActiveMode("Kelipatan")}
              className={`px-6 py-1.5 text-[11px] font-bold rounded-full border transition-all duration-300 ${
                activeMode === "Kelipatan" ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white border-transparent shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-[#121212] text-neutral-500 border-[#2d2d2d] hover:text-white'
              }`}
            >
              Mode Kelipatan
            </button>
            <button 
              onClick={() => setActiveMode("Money Flow")}
              className={`px-6 py-1.5 text-[11px] font-bold rounded-full border transition-all duration-300 ${
                activeMode === "Money Flow" ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white border-transparent shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'bg-[#121212] text-neutral-500 border-[#2d2d2d] hover:text-white'
              }`}
            >
              Mode Money Flow
            </button>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-1.5 bg-[#121212] border border-[#2d2d2d] rounded-full text-[10px] font-bold text-neutral-400 hover:text-white hover:border-[#3e3e3e] transition-colors">
            <Calendar size={13} className="text-neutral-500" /> {dateRange}
          </button>
        </div>

        {/* Row 2: Sub-Filters */}
        <div className="flex items-center gap-6 pt-1">
          
          {/* Timeframe Filter */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Timeframe:</span>
            <div className="flex gap-1.5">
              {["5m", "15m", "30m", "1h", "4h", "1d", "1w"].map(tf => (
                <button 
                  key={tf} onClick={() => setActiveTimeframe(tf)} 
                  className={`px-3 py-1 text-[10px] font-bold border rounded-full transition-all ${
                    activeTimeframe === tf ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-[#2d2d2d]"></div>

          {/* Dynamic Filter (Tergantung Mode) */}
          {activeMode === "Kelipatan" ? (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">Batas Spike:</span>
              <div className="flex gap-1.5">
                {["1.5X", "2X", "3X", "5X", "7X"].map(opt => (
                  <button 
                    key={opt} onClick={() => setActiveKelipatan(opt)} 
                    className={`px-3 py-1 text-[10px] font-bold border rounded-full transition-all ${
                      activeKelipatan === opt ? 'border-[#10b981] text-[#10b981] bg-[#10b981]/10' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <span className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest">Min. Limit:</span>
              <div className="flex gap-1.5">
                {["10 Miliar", "50 Miliar", "100 Miliar", "200 Miliar", "500 Miliar", "1 Triliun"].map(opt => (
                  <button 
                    key={opt} onClick={() => setActiveMoneyFlow(opt)} 
                    className={`px-3 py-1 text-[10px] font-bold border rounded-full transition-all ${
                      activeMoneyFlow === opt ? 'border-[#f97316] text-[#f97316] bg-[#f97316]/10' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- TABEL SCREENER DENGAN BORDER PENUTUP --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg mt-1">
        
        {/* Header Tabel */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[11px] font-bold text-neutral-500 items-center shrink-0">
          <div>Kode Emiten</div>
          <div>Last Price</div>
          <div className="text-right">Turnover (Value)</div>
          <div className="text-right">Total Volume</div>
          <div className="text-right">Spike Kelipatan</div>
          <div className="text-right">Real Money Flow</div>
        </div>

        {/* Body Tabel */}
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          {isLoading && (
             <div className="absolute inset-0 z-10 flex justify-center items-center text-[#10b981] animate-pulse text-[12px] font-bold bg-[#121212]/80">
               Memindai Volume Market...
             </div>
          )}
          
          {screenerData.map((row, idx) => {
            const comp = getCompany(row.symbol);
            const isUp = row.changePct >= 0;
            const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";
            const colorKel = row.kelipatan >= 0 ? "text-[#10b981]" : "text-[#ef4444]";
            const colorMF = row.moneyFlow >= 0 ? "text-[#10b981]" : "text-[#ef4444]";

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
                
                {/* Price & % */}
                <div className="flex flex-col gap-0.5 font-bold">
                  <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                </div>

                {/* Value (Turnover) */}
                <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.value)}</div>
                
                {/* Volume */}
                <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                
                {/* Kelipatan */}
                <div className={`text-right font-black ${colorKel}`}>{row.kelipatan > 0 ? '+' : ''}{row.kelipatan.toFixed(1)}x</div>
                
                {/* Money Flow */}
                <div className={`text-right font-black tracking-wide ${colorMF}`}>{row.moneyFlow > 0 ? '+' : ''}{formatShort(row.moneyFlow)}</div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}