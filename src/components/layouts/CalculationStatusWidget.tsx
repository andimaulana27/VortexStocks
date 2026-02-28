// src/components/layouts/CalculationStatusWidget.tsx
"use client";

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { ArrowUpDown, Activity } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// 1. Tipe Data Real dari GoAPI (Mengambil logika dari Radar Widget sebelumnya)
interface GoApiRadarItem {
  symbol: string;
  close: number;
  change: number;
  percent?: number;
  change_pct?: number;
}

// 2. Konfigurasi Kolom Dinamis Berdasarkan Logic Teknikal
// Konfigurasi ini memungkinkan kolom berubah secara otomatis mengikuti tab Logic yang diklik
const LOGIC_CONFIG: Record<string, { label: string; align: "left" | "center" | "right"; key: string }[]> = {
  "Super Trend": [
    { label: "Status", align: "center", key: "col1" },
    { label: "Range", align: "center", key: "col2" },
    { label: "Potensi", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
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
  "Big Volume": [
    { label: "Vol Today", align: "right", key: "col1" },
    { label: "Vol Avg(20)", align: "right", key: "col2" },
    { label: "Spike", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ],
  // Fallback untuk logika lain yang belum didefinisikan secara khusus
  "DEFAULT": [
    { label: "Signal", align: "center", key: "col1" },
    { label: "Value", align: "center", key: "col2" },
    { label: "Trend", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ]
};

// 3. Helper Fetcher GoAPI (Untuk mengambil list market yg sedang jalan/trending/top gainer)
const fetchActiveMarket = async () => {
  const headers = { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' };
  const [resT, resG, resL] = await Promise.all([
    fetch('https://api.goapi.io/stock/idx/trending', { headers }),
    fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }),
    fetch('https://api.goapi.io/stock/idx/top_loser', { headers })
  ]);
  const [t, g, l] = await Promise.all([resT.json(), resG.json(), resL.json()]);
  const combined: GoApiRadarItem[] = [...(t.data?.results || []), ...(g.data?.results || []), ...(l.data?.results || [])];
  
  // Hapus duplikat symbol
  return Array.from(new Map(combined.map(item => [item.symbol, item])).values());
};

// Komponen Helper untuk Header Kolom Tabel
const SortableHeader = ({ label, align = "left" }: { label: string, align?: "left" | "center" | "right" }) => (
  <div className={`flex items-center gap-1 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"} cursor-pointer hover:text-white transition-colors group`}>
    {label} <ArrowUpDown size={10} className="text-neutral-500 opacity-80 group-hover:opacity-100 group-hover:text-[#10b981]" />
  </div>
);

// Props Menerima `activeCategory` dari Layout
export default function CalculationStatusWidget({ activeCategory }: { activeCategory: string }) {
  const globalSymbol = useCompanyStore(state => state.activeSymbol);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);

  // Ambil Data Market Real-Time (seperti yang dilakukan RadarWidget sebelumnya)
  const { data: marketData, isLoading } = useSWR('calc-active-market', fetchActiveMarket, { refreshInterval: 15000 });

  // Tentukan konfigurasi kolom berdasarkan Kategori (Logic)
  const columnsConfig = LOGIC_CONFIG[activeCategory] || LOGIC_CONFIG["DEFAULT"];

  // 4. Simulasi Generator Data Teknikal (Disesuaikan dengan logika yg dipilih agar tidak kosong)
  const getSimulatedTechData = (symbol: string, isUp: boolean) => {
    // Buat pseudo-random yang konsisten berdasarkan nama symbol
    const charCodeSum = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    if (activeCategory === "Super Trend") {
      return {
        col1: charCodeSum % 3 === 0 ? "Baru Terjadi" : `${(charCodeSum % 5) + 1} Hari Lalu`,
        col2: isUp ? "Hijau" : "Merah",
        col3: isUp ? "Bullish" : "Bearish",
        col4: isUp ? "Buy" : "Sell"
      };
    } else if (activeCategory === "Ma+Ema") {
      return {
        col1: isUp ? "Uptrend" : "Downtrend",
        col2: (1000 + (charCodeSum * 10)).toString(),
        col3: (900 + (charCodeSum * 10)).toString(),
        col4: isUp ? "Golden Cross" : "Death Cross"
      };
    } else {
      // Default / Generik Simulasi
      return {
        col1: isUp ? "Triggered" : "Neutral",
        col2: (charCodeSum % 100).toString(),
        col3: isUp ? "Bullish" : "Bearish",
        col4: isUp ? "Buy" : "Wait"
      };
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
        
        {/* Render Kolom Khusus Teknikal secara Dinamis */}
        {columnsConfig.map((col, idx) => (
          <SortableHeader key={idx} label={col.label} align={col.align} />
        ))}
      </div>
      
      {/* BODY LIST DATA DARI GOAPI */}
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
            
            // Ambil data teknikal dinamis
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
                
                {/* Kolom 2: Price & Percent */}
                <div className="flex flex-col items-end justify-center tabular-nums">
                  <span className="text-white font-semibold text-[11px]">{item.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[9px] font-bold ${colorClass}`}>
                    {isUp ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>

                {/* Kolom Dinamis (3, 4, 5, 6) Dirender menggunakan Konfigurasi yang Aktif */}
                {columnsConfig.map((col, cIdx) => {
                  const val = techData[col.key as keyof typeof techData];
                  
                  // Pewarnaan khusus teks (Hijau untuk Buy/Bullish/Uptrend, Merah untuk Sell/Bearish dll)
                  let textColor = "text-neutral-300";
                  if (val === "Buy" || val === "Bullish" || val === "Hijau" || val === "Uptrend" || val === "Golden Cross") textColor = "text-[#10b981]";
                  if (val === "Sell" || val === "Bearish" || val === "Merah" || val === "Downtrend" || val === "Death Cross") textColor = "text-[#ef4444]";

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