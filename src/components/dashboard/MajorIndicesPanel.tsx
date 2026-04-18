// src/components/dashboard/MajorIndicesPanel.tsx
"use client";

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// --- PROPS BARU DARI DASHBOARD ---
interface MajorIndicesPanelProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

// Daftar kode sektor yang HARUS DISARING agar tidak masuk ke panel Indeks
const SECTOR_CODES = [
  "IDXTECHNO", "TECHNO", "IDXENERGY", "ENERGY", "IDXBASIC", "BASIC", "IDXBASIC-S", 
  "IDXINFRA", "INFRA", "IDXTRANS", "TRANS", "IDXHEALTH", "HEALTH", 
  "IDXINDUST", "INDUST", "IDXFINANCE", "FINANCE", "IDXCYCLIC", "CYCLIC", 
  "IDXPROPERT", "PROPERT", "IDXNONCYC", "NONCYC"
];

// KAMUS NAMA PENDEK INDEKS (Mengatasi deskripsi API yang berupa paragraf panjang)
const INDEX_SHORT_NAMES: Record<string, string> = {
  "COMPOSITE": "IHSG (Indeks Harga Saham Gabungan)",
  "IHSG": "IHSG (Indeks Harga Saham Gabungan)",
  "LQ45": "Indeks LQ45",
  "IDX30": "Indeks IDX30",
  "IDX80": "Indeks IDX80",
  "JII": "Jakarta Islamic Index (JII)",
  "JII70": "Jakarta Islamic Index 70",
  "ISSI": "Indeks Saham Syariah Indonesia",
  "IDXHIDIV20": "IDX High Dividend 20",
  "IDXESGL": "IDX ESG Leaders",
  "IDXQ30": "IDX Quality 30",
  "IDXG30": "IDX Growth 30",
  "IDXV30": "IDX Value 30",
  "SMC-LIQ": "Indeks SMC Liquid",
  "SMC-COM": "Indeks SMC Composite",
  "KOMPAS100": "Indeks Kompas 100",
  "BISNIS-27": "Indeks Bisnis-27",
  "PEFINDO25": "Indeks Pefindo 25",
  "SRI-KEHATI": "Indeks SRI-KEHATI",
  "MNC36": "Indeks MNC36",
  "INFOBANK15": "Indeks Infobank15",
  "IDXBUMN20": "Indeks BUMN 20",
  "IDXSMC-LIQ": "IDX SMC Liquid",
  "IDXSMC-COM": "IDX SMC Composite"
};

// Kumpulan warna gradient premium untuk Avatar Logo
const GRADIENTS = [
  "bg-gradient-to-br from-blue-600 to-blue-800",
  "bg-gradient-to-br from-cyan-500 to-blue-600",
  "bg-gradient-to-br from-indigo-500 to-purple-600",
  "bg-gradient-to-br from-emerald-500 to-green-700",
  "bg-gradient-to-br from-orange-400 to-red-500",
  "bg-gradient-to-br from-teal-400 to-emerald-500",
  "bg-gradient-to-br from-sky-400 to-blue-500",
  "bg-gradient-to-br from-violet-500 to-fuchsia-600",
  "bg-gradient-to-br from-rose-500 to-pink-600",
  "bg-gradient-to-br from-amber-500 to-orange-600",
];

interface GoApiIndexItem {
  symbol: string;
  name?: string;
  description?: string;
  price?: {
    close: number;
    change: number;
    change_pct: number;
    volume?: number;
  };
}

// Fungsi Cerdas untuk Generate Teks Avatar & Warna secara Dinamis
const getAvatarConfig = (symbol: string) => {
  const sym = symbol.toUpperCase();
  let text = sym.substring(0, 3);
  
  // Custom Singkatan untuk Indeks Populer
  if (sym === "COMPOSITE" || sym === "IHSG") text = "IHSG";
  else if (sym === "LQ45") text = "LQ";
  else if (sym === "IDX30") text = "I30";
  else if (sym === "IDX80") text = "I80";
  else if (sym.startsWith("IDX")) text = sym.replace("IDX", "").substring(0, 3);
  else if (sym === "KOMPAS100") text = "K100";
  else if (sym === "BISNIS-27") text = "B27";
  else if (sym === "SRI-KEHATI") text = "SRI";

  // Hash sederhana agar warna selalu konsisten untuk simbol yang sama
  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = GRADIENTS[Math.abs(hash) % GRADIENTS.length];

  return { text, color };
};

// --- UPDATE KEAMANAN: Fetcher Proxy Internal ---
const proxyFetcher = async (endpoint: string) => {
  const res = await fetch(`/api/market?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) throw new Error('Gagal menarik data Indices dari API Proxy');
  const json = await res.json();
  return json.data?.results || [];
};

export default function MajorIndicesPanel({ customDate, dateMode, endDate }: MajorIndicesPanelProps) {
  
  // BUILD ENDPOINT SWR DINAMIS BERDASARKAN TANGGAL
  const indicesEndpoint = useMemo(() => {
    const base = 'stock/idx/indices';
    const params = new URLSearchParams();
    
    if (dateMode === 'single' && customDate) {
      params.append('date', customDate);
    } else if (dateMode === 'range' && endDate) {
      // Untuk snapshot indeks di mode range, kita gunakan hari terakhir dari rentang tersebut
      params.append('date', endDate);
    }
    
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  }, [dateMode, customDate, endDate]);

  // SWR Fetching menggunakan Proxy
  const { data: indicesData, isLoading, error: isError } = useSWR(
    indicesEndpoint, 
    proxyFetcher, 
    { refreshInterval: 15000, dedupingInterval: 2000 }
  );

  // Mapping Dinamis: Menyedot SELURUH data Index API & Memfilter Sektor
  const allIndices = useMemo(() => {
    if (!indicesData || !Array.isArray(indicesData)) return [];

    const filteredIndices = indicesData.filter((item: GoApiIndexItem) => {
      const sym = (item.symbol || "").toUpperCase();
      return !SECTOR_CODES.includes(sym); // Singkirkan jika itu adalah sektor
    });

    const mapped = filteredIndices.map((item: GoApiIndexItem) => {
      const sym = (item.symbol || "").toUpperCase();
      const { text: avatarText, color } = getAvatarConfig(sym);
      
      const shortName = INDEX_SHORT_NAMES[sym] || `${sym} Index`;
      
      const close = item.price?.close ?? 0;
      const change = item.price?.change ?? 0;
      const pct = item.price?.change_pct ?? 0;
      const volume = item.price?.volume ?? 0;

      return {
        originalSymbol: sym,
        symbol: sym === "COMPOSITE" ? "IHSG" : sym,
        name: shortName,
        avatarText,
        color,
        close,
        change,
        pct,
        isUp: change >= 0,
        volume
      };
    });

    // URUTKAN DATA: IHSG Selalu di atas, sisanya diurutkan berdasarkan Volume tertinggi
    mapped.sort((a, b) => {
      if (a.originalSymbol === "COMPOSITE" || a.originalSymbol === "IHSG") return -1;
      if (b.originalSymbol === "COMPOSITE" || b.originalSymbol === "IHSG") return 1;
      return b.volume - a.volume;
    });

    return mapped;
  }, [indicesData]);

  // Render nilai pergerakan dengan panah
  const renderChange = (change: number, pct: number, isUp: boolean) => {
    if (change === 0 && pct === 0) {
      return <span className="text-neutral-500 font-bold flex items-center gap-0.5 justify-end">0.00 (0.00%)</span>;
    }
    
    const colorClass = isUp ? "text-[#10b981]" : "text-[#ef4444]";
    const Icon = isUp ? ArrowUpRight : ArrowDownRight;
    const sign = isUp ? "+" : "";

    return (
      <span className={`flex items-center justify-end gap-0.5 ${colorClass} font-bold`}>
        <Icon size={12} strokeWidth={3} className="shrink-0" />
        {Math.abs(change).toLocaleString("id-ID", { minimumFractionDigits: 2 })} 
        <span className="ml-0.5 opacity-90">({sign}{pct.toFixed(2)}%)</span>
      </span>
    );
  };

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-lg flex flex-col h-full overflow-hidden shadow-lg relative">
      
      {/* HEADER (Bersih, Tab Dihapus) */}
      <div className="px-4 py-3 border-b border-[#2d2d2d] bg-[#121212] shrink-0 flex justify-between items-center z-10">
        <h2 className="text-white text-[13px] font-bold tracking-wide">Major Indices (ALL IDX)</h2>
        
        {/* Indikator Live Sync di Pojok Kanan Atas */}
        {isLoading && allIndices.length > 0 && (
          <div className="flex items-center gap-1.5 text-[#10b981] text-[9px] font-bold animate-pulse">
            <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></div> Syncing
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-0 bg-[#121212] relative pb-10">
        
        {isLoading && allIndices.length === 0 ? (
          // SKELETON LOADER (Anti-Blank saat baru pertama buka web)
          <div className="flex flex-col">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d]/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2d2d2d] animate-pulse shrink-0"></div>
                  <div className="flex flex-col gap-1.5">
                    <div className="w-16 h-3 bg-[#2d2d2d] rounded animate-pulse"></div>
                    <div className="w-24 h-2 bg-[#2d2d2d] rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="w-14 h-3 bg-[#2d2d2d] rounded animate-pulse"></div>
                  <div className="w-20 h-2 bg-[#2d2d2d] rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex justify-center items-center h-full text-[#ef4444] text-xs font-medium text-center px-4">
            Gagal menarik data Indeks dari API.
          </div>
        ) : allIndices.length === 0 ? (
          <div className="flex justify-center items-center h-full text-neutral-500 text-xs font-medium text-center px-4">
            Tidak ada data Indeks saat ini.
          </div>
        ) : (
          <div className="flex flex-col">
            {allIndices.map((idxData, i) => (
              
              // BARIS LIST INDEKS DINAMIS
              <div 
                key={i} 
                className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d]/50 hover:bg-[#1e1e1e] transition-colors cursor-pointer group"
              >
                {/* BAGIAN KIRI: Avatar Kustom, Symbol, Deskripsi Rapi */}
                <div className="flex items-center gap-3 overflow-hidden">
                  
                  {/* AVATAR LOGO KUSTOM DINAMIS */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-[10px] shrink-0 shadow-inner ${idxData.color}`}>
                    {idxData.avatarText}
                  </div>

                  <div className="flex flex-col truncate">
                    <span className="text-white text-[12px] font-bold tracking-wide group-hover:text-[#10b981] transition-colors truncate">
                      {idxData.symbol}
                    </span>
                    <span className="text-neutral-500 text-[10px] font-medium truncate mt-0.5 max-w-[140px] md:max-w-[200px]" title={idxData.name}>
                      {idxData.name}
                    </span>
                  </div>
                </div>

                {/* BAGIAN KANAN: Price & Change */}
                <div className="flex flex-col items-end shrink-0 pl-2 tabular-nums">
                  <span className="text-white text-[12px] font-bold mb-0.5">
                    {idxData.close > 0 ? idxData.close.toLocaleString("id-ID", { minimumFractionDigits: 2 }) : "0.00"}
                  </span>
                  <div className="text-[10px]">
                    {renderChange(idxData.change, idxData.pct, idxData.isUp)}
                  </div>
                </div>

              </div>

            ))}
          </div>
        )}
      </div>
    </div>
  );
}