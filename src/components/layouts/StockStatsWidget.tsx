"use client";

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- HELPER FORMATTING ---
const formatVal = (num: number) => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
  return num.toLocaleString('id-ID');
};

const formatLot = (num: number) => {
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  return num.toLocaleString('id-ID');
};

// --- HELPER ARA / ARB CALCULATION (IDX RULES) ---
const calculateAraArb = (prev: number) => {
  let araPct = 0.20, arbPct = 0.20; // Default > 2000
  if (prev >= 50 && prev <= 200) { araPct = 0.35; arbPct = 0.35; } 
  else if (prev > 200 && prev <= 2000) { araPct = 0.25; arbPct = 0.25; }

  const ara = prev + (prev * araPct);
  const arb = prev - (prev * arbPct);

  // Simple Tick Rounding (Approximation)
  const roundTick = (val: number, isAra: boolean) => {
    let tick = 1;
    if (val >= 200 && val < 500) tick = 2;
    else if (val >= 500 && val < 2000) tick = 5;
    else if (val >= 2000 && val < 5000) tick = 10;
    else if (val >= 5000) tick = 25;
    return isAra ? Math.floor(val / tick) * tick : Math.ceil(val / tick) * tick;
  };

  return { ara: roundTick(ara, true), arb: roundTick(arb, false) };
};

// --- KOMPONEN UTAMA ---
export default function StockStatsWidget() {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "VKTR";
  const getCompany = useCompanyStore(state => state.getCompany);
  const company = getCompany(globalSymbol);
  
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  
  // 1. Fetch Prices
  const { data: activePrice } = useSWR(
    `layout-stats-${globalSymbol}`, 
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${globalSymbol}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()), 
    { refreshInterval: 5000 }
  );

  const priceData = activePrice?.data?.results?.[0] || null;

  // --- KALKULASI DATA STATISTIK REAL ---
  const stats = useMemo(() => {
    if (!priceData) return null;
    const close = priceData.close || 0;
    const change = priceData.change || 0;
    const changePct = priceData.change_pct || 0;
    const prev = close - change;
    const open = priceData.open || prev;
    const high = priceData.high || prev;
    const low = priceData.low || prev;
    const volShares = priceData.volume || 0;
    const lot = volShares / 100; 

    const { ara, arb } = calculateAraArb(prev);
    
    // Estimasi Rata-rata & Nilai Transaksi
    const avg = Math.round((high + low + close) / 3) || prev;
    const val = volShares * avg;

    return { 
      close, change, changePct, prev, open, high, low, 
      lot, ara, arb, avg, val
    };
  }, [priceData]);

  // HELPER WARNA HARGA
  const getColor = (val: number, prev: number) => {
    if (!val || !prev) return "text-white";
    if (val > prev) return "text-[#10b981]";
    if (val < prev) return "text-[#ef4444]";
    return "text-[#eab308]"; // Kuning (Sama dengan prev)
  };

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col h-full overflow-hidden shadow-lg w-full font-sans relative">
      
      {/* HEADER: Symbol & Harga */}
      <div className="flex justify-between items-center p-3 border-b border-[#2d2d2d] shrink-0">
         <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
               src={company?.logo || `https://s3.goapi.io/logo/${globalSymbol}.jpg`} 
               alt="logo" 
               className="w-6 h-6 rounded-full bg-white object-contain p-0.5 border border-[#2d2d2d]" 
               onError={(e) => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}
            />
            <span className="font-extrabold text-white text-[15px] tracking-wide">{globalSymbol}</span>
         </div>
         <div className="flex flex-col items-end leading-tight">
            <span className={`font-bold text-[15px] ${stats && stats.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
               {stats?.close.toLocaleString('id-ID') || "-"}
            </span>
            <span className={`font-semibold text-[11px] ${stats && stats.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
               {stats?.change > 0 ? "+" : ""}{stats?.change || 0} ({stats?.changePct.toFixed(2)}%)
            </span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col">
         
         {/* SEKSI 1: PRICE ACTION & LIMITS */}
         <div className="px-4 py-3 border-b border-[#2d2d2d]">
            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest mb-3 block">Price Statistics</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[11px]">
               <div className="flex justify-between items-center"><span className="text-neutral-500">Previous</span> <span className="font-bold text-white">{stats?.prev.toLocaleString('id-ID') || "-"}</span></div>
               <div className="flex justify-between items-center"><span className="text-neutral-500">Average</span> <span className="font-bold text-[#eab308]">{stats?.avg.toLocaleString('id-ID') || "-"}</span></div>
               <div className="flex justify-between items-center"><span className="text-neutral-500">Open</span> <span className={`font-bold ${getColor(stats?.open || 0, stats?.prev || 0)}`}>{stats?.open.toLocaleString('id-ID') || "-"}</span></div>
               <div className="flex justify-between items-center"><span className="text-neutral-500">ARA</span> <span className="font-bold text-[#10b981]">{stats?.ara.toLocaleString('id-ID') || "-"}</span></div>
               <div className="flex justify-between items-center"><span className="text-neutral-500">High</span> <span className={`font-bold ${getColor(stats?.high || 0, stats?.prev || 0)}`}>{stats?.high.toLocaleString('id-ID') || "-"}</span></div>
               <div className="flex justify-between items-center"><span className="text-neutral-500">ARB</span> <span className="font-bold text-[#ef4444]">{stats?.arb.toLocaleString('id-ID') || "-"}</span></div>
               <div className="flex justify-between items-center"><span className="text-neutral-500">Low</span> <span className={`font-bold ${getColor(stats?.low || 0, stats?.prev || 0)}`}>{stats?.low.toLocaleString('id-ID') || "-"}</span></div>
            </div>
         </div>

         {/* SEKSI 2: LIQUIDITY (VOLUME & VALUE) */}
         <div className="px-4 py-3">
            <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest mb-3 block">Liquidity</span>
            <div className="flex flex-col gap-2.5 text-[11px]">
               <div className="flex justify-between items-center">
                 <span className="text-neutral-500">Volume (Lot)</span> 
                 <span className="font-bold text-[#10b981]">{formatLot(stats?.lot || 0)}</span>
               </div>
               <div className="flex justify-between items-center p-2 bg-[#1e1e1e] rounded border border-[#2d2d2d]">
                 <span className="text-neutral-400 font-bold uppercase text-[10px]">Turnover</span> 
                 <span className="font-black text-[#0ea5e9] text-[12px]">Rp {formatVal(stats?.val || 0)}</span>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}