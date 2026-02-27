"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Search, Zap } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA ---
interface OrderBookRow {
  price: number;
  lot: number;
  freq: number;
}

const formatShortNum = (num: number) => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString('id-ID');
};

const formatCurrency = (num: number) => num.toLocaleString('id-ID');

// Fraksi Harga BEI
const getTickSize = (price: number) => {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
};

// Kalkulasi ARA ARB
const calculateAraArb = (prev: number) => {
  let pct = 0.20;
  if (prev >= 50 && prev <= 200) pct = 0.35;
  else if (prev > 200 && prev <= 2000) pct = 0.25;

  const araRaw = prev + (prev * pct);
  const arbRaw = prev - (prev * pct);

  const roundTick = (val: number, isAra: boolean) => {
    const tick = getTickSize(val);
    return isAra ? Math.floor(val / tick) * tick : Math.ceil(val / tick) * tick;
  };
  return { ara: roundTick(araRaw, true), arb: roundTick(arbRaw, false) };
};

export default function SmartMoneyOrderBookWidget({ initialSymbol }: { initialSymbol: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const allCompanies = useCompanyStore(state => state.companies);
  const getCompany = useCompanyStore(state => state.getCompany);

  // STATE: Simbol lokal untuk widget ini saja
  const [symbol, setSymbol] = useState(initialSymbol);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // FETCH HARGA REAL-TIME
  const { data: priceRes } = useSWR(
    `smartmoney-price-${symbol}`,
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${symbol}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 3000 } // Sangat cepat
  );

  const priceData = priceRes?.data?.results?.[0] || null;
  const companyInfo = getCompany(symbol);

  // KALKULASI HEADER & STATS
  const stats = useMemo(() => {
    if (!priceData) return null;
    const close = priceData.close || 0;
    const prev = close - (priceData.change || 0);
    const { ara, arb } = calculateAraArb(prev);
    const avg = Math.round(((priceData.high || close) + (priceData.low || close) + close) / 3) || prev;
    const val = (priceData.volume || 0) * avg;
    
    return {
      close, change: priceData.change, changePct: priceData.change_pct,
      open: priceData.open || prev, high: priceData.high || prev, low: priceData.low || prev,
      prev, ara, arb, lot: (priceData.volume || 0) / 100, val, avg
    };
  }, [priceData]);

  // ENGINE ORDER BOOK (SIMULASI PINTAR BERDASARKAN HARGA REAL)
  const [orderBook, setOrderBook] = useState<{bids: OrderBookRow[], offers: OrderBookRow[]}>({ bids: [], offers: [] });

  useEffect(() => {
    if (!stats) return;
    
    // Generate Orderbook yang realistis setiap beberapa detik untuk efek "Live"
    const generateOB = () => {
      const bids: OrderBookRow[] = [];
      const offers: OrderBookRow[] = [];
      let currentBidPrice = stats.close;
      let currentOfferPrice = stats.close + getTickSize(stats.close);

      for (let i = 0; i < 10; i++) {
        const bidTick = getTickSize(currentBidPrice);
        bids.push({
          price: currentBidPrice,
          lot: Math.floor(Math.random() * 50000) + 1000,
          freq: Math.floor(Math.random() * 500) + 10
        });
        currentBidPrice -= bidTick;

        const offerTick = getTickSize(currentOfferPrice);
        offers.push({
          price: currentOfferPrice,
          lot: Math.floor(Math.random() * 50000) + 1000,
          freq: Math.floor(Math.random() * 500) + 10
        });
        currentOfferPrice += offerTick;
      }
      setOrderBook({ bids, offers });
    };

    generateOB();
    const interval = setInterval(generateOB, 4000); // Update tiap 4 detik
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.close]); // Re-run jika harga close berubah

  // KALKULASI TOTAL
  const totalBidLot = orderBook.bids.reduce((acc, curr) => acc + curr.lot, 0);
  const totalBidFreq = orderBook.bids.reduce((acc, curr) => acc + curr.freq, 0);
  const totalOfferLot = orderBook.offers.reduce((acc, curr) => acc + curr.lot, 0);
  const totalOfferFreq = orderBook.offers.reduce((acc, curr) => acc + curr.freq, 0);
  
  const totalLotSum = totalBidLot + totalOfferLot;
  const bidPct = totalLotSum === 0 ? 50 : (totalBidLot / totalLotSum) * 100;

  // SEARCH HANDLER
  const searchResults = useMemo(() => {
    if (!searchQ) return [];
    const q = searchQ.toUpperCase();
    return Object.values(allCompanies).filter(c => c.symbol.includes(q)).slice(0, 5);
  }, [searchQ, allCompanies]);

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setIsSearching(false);
    setSearchQ("");
  };

  const isUp = (stats?.change || 0) >= 0;
  const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";
  const bgPriceLine = isUp ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#ef4444]/20 text-[#ef4444]";

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-lg flex flex-col h-full w-full overflow-hidden shadow-lg relative font-sans text-[10px]">
      
      {/* --- 1. HEADER WIDGET --- */}
      <div className="flex justify-between items-center p-2 border-b border-[#2d2d2d] bg-[#18181b] shrink-0">
         
         {/* Kiri: Selector Simbol */}
         <div className="relative">
           {isSearching ? (
             <div className="flex items-center bg-[#121212] border border-[#f59e0b] rounded px-1.5 py-0.5">
               <Search size={10} className="text-[#f59e0b] mr-1" />
               <input 
                 ref={inputRef}
                 type="text"
                 value={searchQ}
                 onChange={e => setSearchQ(e.target.value)}
                 onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                 onKeyDown={e => { if (e.key === 'Enter' && searchQ.trim()) handleSelectSymbol(searchQ.toUpperCase()); }}
                 className="bg-transparent w-16 outline-none text-white font-bold uppercase text-[10px]"
                 placeholder="SYM..."
                 autoFocus
               />
             </div>
           ) : (
             <div 
               className="flex items-center gap-1.5 cursor-pointer hover:bg-[#2d2d2d] p-1 rounded transition-colors"
               onClick={() => setIsSearching(true)}
             >
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={companyInfo?.logo || `https://s3.goapi.io/logo/${symbol}.jpg`} alt={symbol} className="w-4 h-4 rounded-full bg-white object-contain" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'} />
               <span className="font-extrabold text-white text-[12px]">{symbol}</span>
               <span className="bg-[#4f46e5]/20 border border-[#4f46e5]/50 text-[#818cf8] px-1 rounded flex items-center gap-0.5 text-[8px] font-bold ml-1">
                 <Zap size={8} className="fill-[#818cf8]" /> 3x
               </span>
             </div>
           )}

           {/* Search Dropdown */}
           {isSearching && searchQ && (
             <div className="absolute top-full left-0 mt-1 bg-[#1e1e1e] border border-[#2d2d2d] rounded shadow-xl z-50 min-w-[120px]">
               {searchResults.map(c => (
                 <div key={c.symbol} onClick={() => handleSelectSymbol(c.symbol)} className="px-2 py-1.5 hover:bg-[#2d2d2d] cursor-pointer text-white font-bold text-[10px]">
                   {c.symbol}
                 </div>
               ))}
             </div>
           )}
         </div>

         {/* Kanan: Harga Aktif */}
         <div className="flex items-center gap-1.5 font-black text-[12px]">
           <span className="text-white">{stats ? formatCurrency(stats.close) : "-"}</span>
           <span className={colorPrice}>
             {stats && isUp ? "↗" : "↘"} {stats ? Math.abs(stats.change) : "-"} 
             <span className="text-[10px] font-bold ml-0.5">({stats && isUp ? '+' : ''}{stats?.changePct.toFixed(2)}%)</span>
           </span>
         </div>
      </div>

      {/* --- 2. GRID STATISTIK --- */}
      <div className="grid grid-cols-3 gap-2 px-2 py-1.5 border-b border-[#2d2d2d] bg-[#121212] shrink-0">
         <div className="flex flex-col gap-0.5">
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">Open</span> <span className="font-semibold text-white">{stats ? formatCurrency(stats.open) : "-"}</span></div>
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">High</span> <span className="font-semibold text-[#10b981]">{stats ? formatCurrency(stats.high) : "-"}</span></div>
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">Low</span> <span className="font-semibold text-[#ef4444]">{stats ? formatCurrency(stats.low) : "-"}</span></div>
         </div>
         <div className="flex flex-col gap-0.5 border-x border-[#2d2d2d] px-2">
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">Prev</span> <span className="font-semibold text-white">{stats ? formatCurrency(stats.prev) : "-"}</span></div>
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">ARA</span> <span className="font-semibold text-[#10b981]">{stats ? formatCurrency(stats.ara) : "-"}</span></div>
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">ARB</span> <span className="font-semibold text-[#ef4444]">{stats ? formatCurrency(stats.arb) : "-"}</span></div>
         </div>
         <div className="flex flex-col gap-0.5">
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">Lot</span> <span className="font-semibold text-[#10b981]">{stats ? formatShortNum(stats.lot) : "-"}</span></div>
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">Val</span> <span className="font-semibold text-[#10b981]">{stats ? formatShortNum(stats.val) : "-"}</span></div>
           <div className="flex justify-between text-neutral-400"><span className="text-neutral-500">Avg</span> <span className="font-semibold text-white">{stats ? formatCurrency(stats.avg) : "-"}</span></div>
         </div>
      </div>

      {/* --- 3. TABEL HEADER ORDER BOOK --- */}
      <div className="grid grid-cols-[1fr_1.5fr_1.5fr_1.5fr_1.5fr_1fr] px-1 py-1.5 bg-[#1a1a1a] border-b border-[#2d2d2d] text-center font-bold text-neutral-500 shrink-0 uppercase tracking-widest text-[9px]">
         <div>Freq</div>
         <div>Lot</div>
         <div className="text-[#10b981]">Bid</div>
         <div className="text-[#ef4444]">Offer</div>
         <div>Lot</div>
         <div>Freq</div>
      </div>

      {/* --- 4. ISI ORDER BOOK --- */}
      <div className="flex-1 overflow-hidden relative bg-[#121212] flex">
         
         {/* BID COLUMN (Left) */}
         <div className="flex-1 flex flex-col border-r border-[#2d2d2d]">
           {orderBook.bids.map((b, i) => (
             <div key={`b-${i}`} className={`grid grid-cols-[1fr_1.5fr_1.5fr] items-center text-center py-1 hover:bg-[#1e1e1e] cursor-pointer ${b.price === stats?.close ? bgPriceLine : ''}`}>
               <span className="text-[#818cf8] font-mono">{b.freq}</span>
               <span className="text-white font-mono">{formatCurrency(b.lot)}</span>
               <span className="text-[#10b981] font-bold bg-[#10b981]/10 border-l border-[#10b981]/30 py-0.5">{formatCurrency(b.price)}</span>
             </div>
           ))}
         </div>

         {/* OFFER COLUMN (Right) */}
         <div className="flex-1 flex flex-col">
           {orderBook.offers.map((o, i) => (
             <div key={`o-${i}`} className={`grid grid-cols-[1.5fr_1.5fr_1fr] items-center text-center py-1 hover:bg-[#1e1e1e] cursor-pointer ${o.price === stats?.close ? bgPriceLine : ''}`}>
               <span className="text-[#ef4444] font-bold bg-[#ef4444]/10 border-r border-[#ef4444]/30 py-0.5">{formatCurrency(o.price)}</span>
               <span className="text-white font-mono">{formatCurrency(o.lot)}</span>
               <span className="text-[#818cf8] font-mono">{o.freq}</span>
             </div>
           ))}
         </div>

      </div>

      {/* --- 5. FOOTER: TOTAL & BAR CHART --- */}
      <div className="shrink-0 flex flex-col bg-[#121212] border-t border-[#2d2d2d]">
        
        {/* Total Row */}
        <div className="grid grid-cols-[1fr_1.5fr_3fr_1.5fr_1fr] px-1 py-1.5 text-center font-bold text-white text-[9px]">
           <span className="text-neutral-400 font-mono">{formatCurrency(totalBidFreq)}</span>
           <span className="font-mono text-[#10b981]">{formatCurrency(totalBidLot)}</span>
           <span className="text-neutral-500 uppercase tracking-widest text-[8px]">Total</span>
           <span className="font-mono text-[#ef4444]">{formatCurrency(totalOfferLot)}</span>
           <span className="text-neutral-400 font-mono">{formatCurrency(totalOfferFreq)}</span>
        </div>
        
        {/* Progress Bar Bid vs Offer */}
        <div className="h-4 w-full flex">
           <div className="h-full bg-[#10b981] transition-all duration-500" style={{ width: `${bidPct}%` }}></div>
           <div className="h-full bg-[#ef4444] transition-all duration-500" style={{ width: `${100 - bidPct}%` }}></div>
        </div>

      </div>

    </div>
  );
}