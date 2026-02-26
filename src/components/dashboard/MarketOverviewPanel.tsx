"use client";

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { useIndices } from '@/hooks/useMarketData';
import { 
  Laptop, Flame, Pickaxe, Building2, Plane, BriefcaseMedical, 
  Factory, Landmark, ShoppingBag, Home, ShoppingCart, 
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// --- KONFIGURASI STATIS (UI DIJAMIN TIDAK BLANK) ---
// Kita "paku" layout 11 sektor dan 3 saham andalannya.
const SECTOR_CONFIG = [
  { id: "IDXTECHNO", fallbackId: "TECHNO", name: "Technology", icon: Laptop, stocks: ["GOTO", "WIFI", "EMTK"] },
  { id: "IDXENERGY", fallbackId: "ENERGY", name: "Energy", icon: Flame, stocks: ["ADRO", "BUMI", "PGAS"] },
  { id: "IDXBASIC", fallbackId: "BASIC", name: "Basic-Ind", icon: Pickaxe, stocks: ["ANTM", "BRMS", "SMGR"] },
  { id: "IDXINFRA", fallbackId: "INFRA", name: "Infrastruc", icon: Building2, stocks: ["TLKM", "ADHI", "JSMR"] },
  { id: "IDXTRANS", fallbackId: "TRANS", name: "Transport", icon: Plane, stocks: ["BIRD", "GIAA", "SMDR"] },
  { id: "IDXHEALTH", fallbackId: "HEALTH", name: "Health", icon: BriefcaseMedical, stocks: ["KLBF", "SIDO", "KAEF"] },
  { id: "IDXINDUST", fallbackId: "INDUST", name: "Industrial", icon: Factory, stocks: ["ASII", "UNTR", "BNBR"] },
  { id: "IDXFINANCE", fallbackId: "FINANCE", name: "Finance", icon: Landmark, stocks: ["BBCA", "BBRI", "BMRI"] },
  { id: "IDXCYCLIC", fallbackId: "CYCLIC", name: "Cyclical", icon: ShoppingBag, stocks: ["MNCN", "SCMA", "LPPF"] },
  { id: "IDXPROPERT", fallbackId: "PROPERT", name: "Property", icon: Home, stocks: ["CTRA", "PWON", "BSDE"] },
  { id: "IDXNONCYC", fallbackId: "NONCYC", name: "Non-Cyclical", icon: ShoppingCart, stocks: ["UNVR", "INDF", "ICBP"] }
];

interface GoApiIndexItem {
  symbol: string;
  price?: { change_pct: number };
}

interface GoApiStockPrice {
  symbol: string;
  change_pct: number;
}

// Fetcher khusus untuk menarik harga 33 saham sekaligus dalam 1 API call (Hemat limit)
const fetchStockPrices = async () => {
  const allSymbols = SECTOR_CONFIG.flatMap(sector => sector.stocks).join(',');
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  
  try {
    const res = await fetch(`https://api.goapi.io/stock/idx/prices?symbols=${allSymbols}`, {
      headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.results || [];
  } catch {
    // FIX ESLINT: Variabel (error) dihapus dari catch karena tidak dipakai
    return [];
  }
};

export default function MarketOverviewPanel() {
  // 1. Ambil data pergerakan Indeks Sektoral dari Global Hook
  const { indicesData, isLoading: isIndicesLoading } = useIndices();

  // 2. Ambil data harga 33 saham penyokong (Auto Refresh tiap 15 detik)
  const { data: stockPricesData, isLoading: isStocksLoading } = useSWR<GoApiStockPrice[]>(
    'sectoral-representative-stocks',
    fetchStockPrices,
    { refreshInterval: 15000, dedupingInterval: 5000 }
  );

  const isLoading = isIndicesLoading || isStocksLoading;

  // 3. Mapping Cerdas (Gabungkan UI Statis dengan Data Dinamis API)
  const renderData = useMemo(() => {
    // Buat kamus indeks untuk pencarian super cepat O(1)
    const indicesMap: Record<string, number> = {};
    if (Array.isArray(indicesData)) {
      indicesData.forEach((item: GoApiIndexItem) => {
        if (item.symbol) indicesMap[item.symbol.toUpperCase()] = item.price?.change_pct || 0;
      });
    }

    // Buat kamus saham untuk pencarian super cepat O(1)
    const stocksMap: Record<string, number> = {};
    if (Array.isArray(stockPricesData)) {
      stockPricesData.forEach((item) => {
        if (item.symbol) stocksMap[item.symbol.toUpperCase()] = item.change_pct || 0;
      });
    }

    // Suntikkan data API asli ke struktur UI Statis
    return SECTOR_CONFIG.map(sector => {
      // Cari nilai indeks (Cek IDXTECHNO dulu, kalau gak ada cek TECHNO)
      const sectorPct = indicesMap[sector.id] ?? indicesMap[sector.fallbackId] ?? 0;
      
      const mappedStocks = sector.stocks.map(sym => ({
        symbol: sym,
        pct: stocksMap[sym] ?? 0
      }));

      return {
        ...sector,
        percent: sectorPct,
        mappedStocks
      };
    });
  }, [indicesData, stockPricesData]);

  // Fungsi Render Teks Persentase sesuai Standar UI Trading (Hijau/Merah)
  const renderPercentage = (pct: number) => {
    if (!pct || pct === 0) {
      return (
        <span className="flex items-center text-neutral-500 font-bold gap-0.5">
          0.00%
        </span>
      );
    }
    const isUp = pct > 0;
    const colorClass = isUp ? "text-[#10b981]" : "text-[#ef4444]";
    const Icon = isUp ? ArrowUpRight : ArrowDownRight;
    
    return (
      <span className={`flex items-center gap-0.5 ${colorClass} font-bold`}>
        <Icon size={12} strokeWidth={3} className="shrink-0" /> 
        {Math.abs(pct).toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-lg flex flex-col h-full overflow-hidden shadow-lg relative">
      
      {/* HEADER (Sederhana dan Rapi, Tab Dihapus) */}
      <div className="px-4 py-3 border-b border-[#2d2d2d] bg-[#121212] shrink-0 flex justify-between items-center">
        <h2 className="text-white text-[13px] font-bold tracking-wide">Market Sectors</h2>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-2 bg-[#121212] relative">
        
        {/* Indikator Loading Tipis di Atas (Tidak mengganggu UI Statis) */}
        {isLoading && (
          <div className="absolute top-2 right-4 z-10 flex items-center gap-1.5 text-[#10b981] text-[9px] font-bold animate-pulse">
            <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></div> Syncing
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pb-16">
          {renderData.map((sector, idx) => (
            
            // KOTAK KARTU SEKTOR
            <div 
              key={idx} 
              className="bg-[#18181b]/60 rounded-md border border-[#2d2d2d] hover:border-neutral-500 transition-colors p-2.5 flex flex-col"
            >
              {/* HEADER KOTAK SEKTOR */}
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#2d2d2d]/60">
                <div className="flex items-center gap-1.5">
                  <sector.icon size={12} className="text-[#10b981]" />
                  <span className="text-white text-[11px] font-bold tracking-wide">{sector.name}</span>
                </div>
                <div className="text-[10px]">
                  {renderPercentage(sector.percent)}
                </div>
              </div>

              {/* LIST 3 SAHAM PENGGERAK */}
              <div className="flex flex-col space-y-1.5">
                {sector.mappedStocks.map((stock, sIdx) => (
                  <div key={sIdx} className="flex justify-between items-center group cursor-pointer hover:bg-[#2d2d2d]/30 px-1 -mx-1 rounded transition-colors">
                    <span className="text-neutral-400 text-[10px] font-semibold group-hover:text-white transition-colors">{stock.symbol}</span>
                    <div className="text-[10px] tabular-nums">
                      {renderPercentage(stock.pct)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ))}
        </div>
      </div>
    </div>
  );
}