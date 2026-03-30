"use client";

import React, { useMemo } from 'react';
// Import hook SWR yang sudah kita buat
import { useIndices, useTrending } from '@/hooks/useMarketData';

// DEFINISI TIPE DATA KETAT SESUAI GOAPI ENTERPRISE
interface GoApiIndexPrice {
  close: number;
  change: number;
  change_pct: number;
}

interface GoApiIndexItem {
  symbol: string;
  price?: GoApiIndexPrice;
}

interface GoApiTrendingItem {
  symbol: string;
  close: number;
  change: number;
  percent: number;
}

interface MappedTickerData {
  symbol: string;
  price?: string;
  changeStr?: string;
  percentStr?: string;
  isUp?: boolean;
  isLabel?: boolean;
}

export default function Topbar() {
  // Panggil data dari "Mesin" SWR secara deklaratif
  const { indicesData, isLoading: isLoadingIndices, isError: errorIndices } = useIndices();
  const { trendingData, isLoading: isLoadingTrending, isError: errorTrending } = useTrending();

  // Status loading dan error gabungan
  const isLoading = isLoadingIndices || isLoadingTrending;
  const errorStatus = errorIndices || errorTrending;

  // OPTIMASI: useMemo memastikan komputasi data hanya terjadi jika ada data baru dari API
  const tickerData = useMemo(() => {
    if (!indicesData && !trendingData) return [];

    let finalTickerData: MappedTickerData[] = [];

    // --- 1. PROSES DATA IHSG ---
    if (Array.isArray(indicesData)) {
      const ihsg = indicesData.find((i: GoApiIndexItem) => i.symbol === "COMPOSITE" || i.symbol === "IHSG");

      if (ihsg) {
        const priceData = ihsg.price; 
        const rawClose = priceData?.close ?? 0;
        const rawChange = priceData?.change ?? 0;
        const rawPct = priceData?.change_pct ?? 0;

        finalTickerData.push({
          symbol: "IHSG",
          price: rawClose.toLocaleString("id-ID", { minimumFractionDigits: 2 }),
          changeStr: rawChange > 0 ? `+${rawChange.toFixed(2)}` : `${rawChange.toFixed(2)}`,
          percentStr: rawPct > 0 ? `+${rawPct.toFixed(2)}%` : `${rawPct.toFixed(2)}%`,
          isUp: rawChange >= 0,
        });
      }
    }

    // --- 2. TAMBAHKAN LABEL PEMISAH ---
    finalTickerData.push({ symbol: "Trending", isLabel: true });

    // --- 3. PROSES DATA SAHAM TRENDING ---
    if (Array.isArray(trendingData)) {
      const mappedTrending = trendingData.map((item: GoApiTrendingItem) => {
        const sym = item.symbol || "-";
        const rawClose = item.close || 0;
        const rawChange = item.change || 0;
        const rawPct = item.percent || 0;

        return {
          symbol: sym,
          price: rawClose.toLocaleString("id-ID"),
          changeStr: rawChange > 0 ? `+${rawChange}` : `${rawChange}`,
          percentStr: rawPct > 0 ? `+${rawPct.toFixed(2)}%` : `${rawPct.toFixed(2)}%`,
          isUp: rawChange >= 0, 
        };
      });

      // Menggabungkan data IHSG, Label, dan Saham Trending
      finalTickerData = [...finalTickerData, ...mappedTrending];
    }

    return finalTickerData;
  }, [indicesData, trendingData]);

  // Fungsi pembantu (Helper) untuk merender elemen individual ticker
  const renderTickerItem = (item: MappedTickerData, keyPrefix: string) => {
    if (item.isLabel) {
      return (
        <div key={`label-${keyPrefix}`} className="flex items-center space-x-2 pl-2">
          <span className="text-neutral-500">{item.symbol}</span>
          <div className="h-3 w-[1px] bg-[#2d2d2d]"></div>
        </div>
      );
    }

    const colorClass = item.isUp ? "text-[#10b981]" : "text-[#ef4444]";
    
    return (
      <div 
        key={`ticker-${item.symbol}-${keyPrefix}`} 
        className="flex items-center space-x-1.5 cursor-pointer hover:bg-[#1e1e1e] px-1.5 py-1 rounded transition-colors"
      >
        <span className="text-white font-bold">{item.symbol}</span>
        <span className={colorClass}>{item.price}</span>
        <span className={colorClass}>
          {item.isUp ? "↑" : "↓"} {item.changeStr} ({item.percentStr})
        </span>
      </div>
    );
  };

  return (
    // Kita ubah overflow menjadi hidden agar tidak ada scrollbar, digantikan oleh animasi
    <div className="w-full h-[42px] bg-[#121212] border-b border-[#2d2d2d] flex items-center overflow-hidden whitespace-nowrap text-[11px] font-medium shrink-0 relative">
      
      {/* INJEKSI CSS ANIMASI MARQUEE (Berjalan ke kiri terus menerus) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); } 
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          /* Anda bisa mengubah '40s' menjadi lebih kecil untuk mempercepat, atau lebih besar untuk memperlambat */
          animation: marquee 240s linear infinite; 
        }
        .animate-marquee:hover {
          /* Animasi akan berhenti (pause) jika mouse user berada di atas baris saham */
          animation-play-state: paused;
        }
      `}} />

      {isLoading ? (
        <div className="flex items-center space-x-2 text-[#10b981] animate-pulse px-4">
          <span>Menyinkronkan Live Ticker...</span>
        </div>
      ) : errorStatus ? (
        <div className="flex items-center space-x-2 text-[#ef4444] px-4">
          <span>Gagal memuat data: API Error</span>
        </div>
      ) : (
        <div className="animate-marquee items-center">
          
          {/* KELOMPOK 1: Data Asli */}
          <div className="flex items-center space-x-5 px-5">
            {tickerData.map((item, index) => renderTickerItem(item, `set1-${index}`))}
          </div>
          
          {/* KELOMPOK 2: Duplikat (Untuk menciptakan ilusi looping mulus tanpa putus) */}
          <div className="flex items-center space-x-5 px-5">
            {tickerData.map((item, index) => renderTickerItem(item, `set2-${index}`))}
          </div>

        </div>
      )}
    </div>
  );
}