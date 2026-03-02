// src/components/layouts/CalculationStatusWidget.tsx
"use client";

import React from 'react';
import useSWR from 'swr';
import { ArrowUpDown, Activity } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// 1. Tipe Data Real dari GoAPI
interface GoApiRadarItem {
  symbol: string;
  close: number;
  change: number;
  percent?: number;
  change_pct?: number;
}

// 2. Konfigurasi 20 Kolom Dinamis Berdasarkan Logic Teknikal
const LOGIC_CONFIG: Record<string, { label: string; align: "left" | "center" | "right"; key: string }[]> = {
  // --- BARIS 1 (ATAS) ---
  "Ma+Ema": [
    { label: "Trend", align: "center", key: "col1" },
    { label: "MA 20", align: "right", key: "col2" },
    { label: "EMA 50", align: "right", key: "col3" },
    { label: "Cross", align: "center", key: "col4" }
  ],
  "Macd": [
    { label: "MACD Line", align: "right", key: "col1" },
    { label: "Signal", align: "right", key: "col2" },
    { label: "Histogram", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Stoch Rsi": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "RSI": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Big Volume": [
    { label: "Vol Today", align: "right", key: "col1" },
    { label: "Vol Avg(20)", align: "right", key: "col2" },
    { label: "Spike", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Breakout Ch": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Breakout", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Trendline ATR": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Breakout", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "DTFX Zone": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Zig-Zag Ch": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Trend", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Money Flow": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Flow", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],

  // --- BARIS 2 (BAWAH) ---
  "ATR SuperTrend": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Breakout", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Reversal": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Trending Market": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Swing H/L": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "RSI Multi Lenght": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Buy Sell": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Swing Flow": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "CS Confirm": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Posisi", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "AURA": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Range", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  "Super Trend": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Range", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],

  // Fallback
  "DEFAULT": [
    { label: "Signal", align: "center", key: "col1" },
    { label: "Value", align: "center", key: "col2" },
    { label: "Trend", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ]
};

// 3. Helper Fetcher GoAPI
const fetchActiveMarket = async () => {
  const headers = { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' };
  const [resT, resG, resL] = await Promise.all([
    fetch('https://api.goapi.io/stock/idx/trending', { headers }),
    fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }),
    fetch('https://api.goapi.io/stock/idx/top_loser', { headers })
  ]);
  const [t, g, l] = await Promise.all([resT.json(), resG.json(), resL.json()]);
  const combined: GoApiRadarItem[] = [...(t.data?.results || []), ...(g.data?.results || []), ...(l.data?.results || [])];
  
  return Array.from(new Map(combined.map(item => [item.symbol, item])).values());
};

const SortableHeader = ({ label, align = "left" }: { label: string, align?: "left" | "center" | "right" }) => (
  <div className={`flex items-center gap-1 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"} cursor-pointer hover:text-white transition-colors group`}>
    {label} <ArrowUpDown size={10} className="text-neutral-500 opacity-80 group-hover:opacity-100 group-hover:text-[#10b981]" />
  </div>
);

export default function CalculationStatusWidget({ activeCategory }: { activeCategory: string }) {
  const globalSymbol = useCompanyStore(state => state.activeSymbol);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);

  const { data: marketData, isLoading } = useSWR('calc-active-market', fetchActiveMarket, { refreshInterval: 15000 });

  const columnsConfig = LOGIC_CONFIG[activeCategory] || LOGIC_CONFIG["DEFAULT"];

  // 4. Generator Data Teknikal Dinamis
  const getSimulatedTechData = (symbol: string, isUp: boolean) => {
    const charCodeSum = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const statusText = charCodeSum % 3 === 0 ? "Baru Terjadi" : (charCodeSum % 4 === 0 ? "1 Minggu Lalu" : `${(charCodeSum % 5) + 1} Hari Lalu`);
    
    // Kelompok 1: Range (AURA, Super Trend)
    if (["Super Trend", "AURA"].includes(activeCategory)) {
      return { col1: statusText, col2: isUp ? "Hijau" : "Merah", col3: isUp ? "Bullish" : "Bearish", col4: isUp ? "Buy" : "Sell" };
    } 
    // Kelompok 2: Breakout (ATR SuperTrend, Breakout Ch, Trendline ATR)
    else if (["ATR SuperTrend", "Breakout Ch", "Trendline ATR"].includes(activeCategory)) {
      return { col1: statusText, col2: isUp ? "Atas" : "Bawah", col3: isUp ? "Bullish" : "Bearish", col4: isUp ? "Buy" : "Wait" };
    } 
    // Kelompok 3: Oversold/Overbought (Reversal, RSI, Stoch Rsi)
    else if (["Reversal", "RSI", "Stoch Rsi"].includes(activeCategory)) {
      return { col1: statusText, col2: isUp ? "Oversold" : (charCodeSum % 2 === 0 ? "Overbought" : "Netral"), col3: isUp ? "Reversal" : "Netral", col4: isUp ? "Buy" : (charCodeSum % 2 === 0 ? "Sell" : "Wait") };
    } 
    // Kelompok 4: Flow & Zone (Money Flow, DTFX Zone)
    else if (["Money Flow", "DTFX Zone"].includes(activeCategory)) {
      return { col1: statusText, col2: isUp ? (activeCategory === "Money Flow" ? "In" : "Support") : (activeCategory === "Money Flow" ? "Out" : "Resistance"), col3: isUp ? "Bullish" : "Bearish", col4: isUp ? "Buy" : "Sell" };
    }
    // Kelompok 5: Posisi Bawah/Atas Umum (Trending, Swing H/L, RSI Multi, dll)
    else if (["Trending Market", "Swing H/L", "RSI Multi Lenght", "Buy Sell", "Swing Flow", "CS Confirm"].includes(activeCategory)) {
      return { col1: statusText, col2: isUp ? "Bawah" : (charCodeSum % 2 === 0 ? "Atas" : "Netral"), col3: isUp ? "Bullish" : (charCodeSum % 2 === 0 ? "Bearish" : "Netral"), col4: isUp ? "Buy" : (charCodeSum % 2 === 0 ? "Sell" : "Wait") };
    } 
    // Kelompok 6: Zig-Zag (Trend)
    else if (activeCategory === "Zig-Zag Ch") {
      return { col1: statusText, col2: isUp ? "Uptrend" : "Downtrend", col3: isUp ? "Bullish" : "Bearish", col4: isUp ? "Buy" : "Wait" };
    }
    // Kelompok 7: MA+EMA (Trend Cross)
    else if (activeCategory === "Ma+Ema") {
      return { col1: isUp ? "Uptrend" : "Downtrend", col2: (1000 + (charCodeSum * 10)).toString(), col3: (900 + (charCodeSum * 10)).toString(), col4: isUp ? "Golden Cross" : "Death Cross" };
    } 
    else {
      return { col1: isUp ? "Triggered" : "Neutral", col2: (charCodeSum % 100).toString(), col3: isUp ? "Bullish" : "Bearish", col4: isUp ? "Buy" : "Wait" };
    }
  };

  return (
    <div className="w-full h-full bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg">
      
      {/* HEADER WIDGET */}
      <div className="px-3 py-2 border-b border-[#2d2d2d] flex items-center justify-between shrink-0 bg-[#121212]">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#0ea5e9]"/>
          <h2 className="text-white text-[11px] font-bold tracking-wide">
            Real-time Scan: <span className="text-[#0ea5e9]">{activeCategory}</span>
          </h2>
        </div>
        <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold border border-[#2d2d2d] px-2 py-0.5 rounded">
          {marketData ? marketData.length : 0} Stocks
        </span>
      </div>

      {/* HEADER KOLOM TABEL DINAMIS */}
      <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-400 shrink-0 bg-[#1e1e1e]/50 tracking-wider">
        <SortableHeader label="Symbol" />
        <SortableHeader label="Price" align="right" />
        {columnsConfig.map((col, idx) => (
          <SortableHeader key={idx} label={col.label} align={col.align} />
        ))}
      </div>
      
      {/* BODY LIST DATA */}
      <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212]">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-[#10b981] animate-pulse text-[10px] font-bold">
            Menyelaraskan Data Market...
          </div>
        ) : marketData && marketData.length > 0 ? (
          marketData.map((item, idx) => {
            const isUp = item.change >= 0;
            const pct = item.percent ?? item.change_pct ?? 0;
            const colorClass = isUp ? "text-[#10b981]" : "text-[#ef4444]";
            const companyInfo = getCompany(item.symbol);
            
            const techData = getSimulatedTechData(item.symbol, isUp);

            return (
              <div 
                key={idx} 
                onClick={() => setGlobalSymbol(item.symbol)}
                className={`grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_1fr_1fr] gap-2 items-center px-3 py-2.5 border-b border-[#2d2d2d]/30 hover:bg-[#1e1e1e] transition-colors group cursor-pointer ${globalSymbol === item.symbol ? 'border-l-2 border-l-[#10b981] bg-[#1e1e1e]' : 'border-l-2 border-l-transparent'}`}
              >
                {/* Kolom 1: Symbol & Logo */}
                <div className="flex items-center gap-2 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={companyInfo?.logo || `https://s3.goapi.io/logo/${item.symbol}.jpg`} 
                    alt={item.symbol} 
                    className="w-5 h-5 rounded-full bg-white object-contain shrink-0" 
                    onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}
                  />
                  <div className="flex flex-col truncate">
                    <span className="text-white font-bold text-[11px] group-hover:text-[#3b82f6] transition-colors tracking-wide">
                      {item.symbol}
                    </span>
                    <span className="text-neutral-500 text-[8px] truncate" title={companyInfo?.name}>
                      {companyInfo?.name || `PT ${item.symbol} Tbk.`}
                    </span>
                  </div>
                </div>
                
                {/* Kolom 2: Price */}
                <div className="flex flex-col items-end justify-center tabular-nums">
                  <span className="text-white font-semibold text-[11px]">{item.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[9px] font-bold ${colorClass}`}>
                    {isUp ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>

                {/* Kolom Dinamis (3-6) */}
                {columnsConfig.map((col, cIdx) => {
                  const val = techData[col.key as keyof typeof techData];
                  
                  // SMART COLORING LOGIC
                  let textColor = "text-neutral-300"; 
                  if (["Buy", "Bullish", "Hijau", "Uptrend", "Golden Cross", "Oversold", "Reversal", "In", "Support"].includes(val)) textColor = "text-[#10b981]";
                  if (["Sell", "Bearish", "Merah", "Downtrend", "Death Cross", "Overbought", "Out", "Resistance"].includes(val)) textColor = "text-[#ef4444]";
                  
                  // Penanganan Ambigu untuk Kata "Atas" dan "Bawah"
                  if (val === "Atas") {
                    textColor = ["ATR SuperTrend", "Breakout Ch", "Trendline ATR"].includes(activeCategory) ? "text-[#10b981]" : "text-[#ef4444]";
                  }
                  if (val === "Bawah") {
                     textColor = ["ATR SuperTrend", "Breakout Ch", "Trendline ATR"].includes(activeCategory) ? "text-[#ef4444]" : "text-[#10b981]";
                  }

                  return (
                    <div key={cIdx} className={`flex ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'} items-center`}>
                      <span className={`${textColor} text-[10px] font-bold whitespace-nowrap`}>
                        {val}
                      </span>
                    </div>
                  );
                })}

              </div>
            );
          })
        ) : (
           <div className="flex justify-center items-center h-full text-neutral-500 text-[10px]">Tidak ada data.</div>
        )}
      </div>

    </div>
  );
}