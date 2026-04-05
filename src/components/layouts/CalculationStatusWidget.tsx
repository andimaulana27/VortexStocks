// src/components/layouts/CalculationStatusWidget.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { ArrowUpDown, ArrowDown, ArrowUp, Activity, Search } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { createClient } from '@/utils/supabase/client';

// 1. Tipe Data
interface GoApiRadarItem {
  symbol: string;
  close: number;
  change: number;
  percent?: number;
  change_pct?: number;
}

interface IndicatorData {
  status?: string;
  [key: string]: string | number | undefined;
}

interface TechnicalSignal {
  symbol: string;
  signal_date: string;
  signals: Record<string, IndicatorData>;
}

// Tipe Data untuk Tanggal Dinamis
export interface DateProps {
  customDate: string;
  dateMode: 'single' | 'range';
  startDate: string;
  endDate: string;
}

// Props Komponen Utama
interface CalculationStatusWidgetProps {
  activeCategory: string;
  dateProps?: DateProps;
  activeTimeframe?: string;
}

// Tipe Data Sorting
type SortDirection = 'default' | 'desc' | 'asc';
interface SortConfig {
  key: string | null;
  direction: SortDirection;
  isDynamic: boolean;
}

// 2. Mapping Kategori UI ke Key JSON dari Bot Python
const CATEGORY_TO_JSON_KEY: Record<string, string> = {
  "Ma+Ema": "ma_ema",
  "Macd": "macd",
  "Stoch Rsi": "stoch_rsi",
  "RSI": "rsi",
  "Big Volume": "big_volume"
};

// 3. Konfigurasi Kolom Dinamis (Disinkronkan dengan Key JSON Python)
type AlignType = "left" | "center" | "right";
interface ColumnConfig { label: string; align: AlignType; key: string; }

const LOGIC_CONFIG: Record<string, ColumnConfig[]> = {
  "Ma+Ema": [
    { label: "Trend", align: "center", key: "trend" },
    { label: "MA 50", align: "right", key: "ma" },
    { label: "EMA 50", align: "right", key: "ema" },
    { label: "Cross", align: "center", key: "cross" }
  ],
  "Macd": [
    { label: "MACD Line", align: "right", key: "macd_line" },
    { label: "Signal", align: "right", key: "signal" },
    { label: "Histogram", align: "center", key: "histogram" },
    { label: "Aksi", align: "center", key: "status" }
  ],
  "Stoch Rsi": [
    { label: "Status", align: "center", key: "status" },
    { label: "%K Line", align: "center", key: "k_line" },
    { label: "%D Line", align: "center", key: "d_line" },
    { label: "Zone", align: "center", key: "zone" }
  ],
  "RSI": [
    { label: "Status", align: "center", key: "status" },
    { label: "Value", align: "center", key: "rsi_value" },
    { label: "Zone", align: "center", key: "zone" },
    { label: "Aksi", align: "center", key: "status" }
  ],
  "Big Volume": [
    { label: "Vol Today", align: "right", key: "vol_today" },
    { label: "Vol Avg(20)", align: "right", key: "vol_ma" },
    { label: "Spike", align: "center", key: "multiplier" },
    { label: "Aksi", align: "center", key: "status" }
  ],
  "DEFAULT": [
    { label: "Signal", align: "center", key: "col1" },
    { label: "Value", align: "center", key: "col2" },
    { label: "Trend", align: "center", key: "col3" },
    { label: "Aksi", align: "center", key: "col4" }
  ]
};

// 4. Helper SWR untuk mengambil harga Real-time GoAPI
const fetchActiveMarketPrices = async () => {
  const headers = { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' };
  try {
    const [resT, resG, resL] = await Promise.all([
      fetch('https://api.goapi.io/stock/idx/trending', { headers }),
      fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }),
      fetch('https://api.goapi.io/stock/idx/top_loser', { headers })
    ]);
    const [t, g, l] = await Promise.all([resT.json(), resG.json(), resL.json()]);
    const combined: GoApiRadarItem[] = [...(t.data?.results || []), ...(g.data?.results || []), ...(l.data?.results || [])];
    return Array.from(new Map(combined.map(item => [item.symbol, item])).values());
  } catch (error) {
    console.error("Gagal menarik harga GoAPI:", error);
    return [];
  }
};

// Komponen Header dengan Fungsi Sorting
const SortableHeader = ({
  label,
  align = "left",
  sortKey,
  isDynamic = false,
  currentSort,
  onSort
}: {
  label: string,
  align?: AlignType,
  sortKey: string,
  isDynamic?: boolean,
  currentSort: SortConfig,
  onSort: (key: string, isDynamic: boolean) => void
}) => {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : 'default';

  return (
    <div
      onClick={() => onSort(sortKey, isDynamic)}
      className={`flex items-center gap-1 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"} cursor-pointer hover:text-white transition-colors group select-none`}
    >
      <span className={isActive && direction !== 'default' ? "text-white" : ""}>{label}</span>
      {direction === 'desc' ? (
        <ArrowDown size={12} className="text-[#10b981]" />
      ) : direction === 'asc' ? (
        <ArrowUp size={12} className="text-[#ef4444]" />
      ) : (
        <ArrowUpDown size={10} className="text-neutral-500 opacity-80 group-hover:opacity-100 group-hover:text-[#10b981]" />
      )}
    </div>
  );
};

// 5. Komponen Badge Premium dengan Rounded-Full
const renderBadge = (value: string) => {
  if (["Buy", "Uptrend", "Golden Cross", "Oversold", "Bullish", "In"].includes(value)) {
    return <span className="bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">{value}</span>;
  }
  if (["Sell", "Downtrend", "Death Cross", "Overbought", "Bearish", "Out"].includes(value)) {
    return <span className="bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">{value}</span>;
  }
  if (value === "Wait" || value === "Neutral" || value === "Sideways") {
    return <span className="bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">{value}</span>;
  }
  return <span className="text-neutral-300 text-[10px] font-semibold">{value === "-" ? "None" : value}</span>;
};

export default function CalculationStatusWidget({ activeCategory, dateProps, activeTimeframe }: CalculationStatusWidgetProps) {
  // Global State (Zustand)
  const globalSymbol = useCompanyStore(state => state.activeSymbol);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);

  // Local State
  const [supaData, setSupaData] = useState<TechnicalSignal[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State untuk Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'default', isDynamic: false });

  // Ambil Harga Aktif dari GoAPI
  const { data: activePrices } = useSWR('calc-active-prices', fetchActiveMarketPrices, { refreshInterval: 15000 });

  // Fallback Timeframe jika tidak dipassing
  const timeframe = activeTimeframe || '1D';

  // Destrukturisasi nilai dari dateProps ke tipe primitif
  const dateMode = dateProps?.dateMode;
  const customDate = dateProps?.customDate;
  const startDate = dateProps?.startDate;
  const endDate = dateProps?.endDate;

  // Ambil Sinyal dari Supabase (Dengan Logic Filter Tanggal & Timeframe)
  useEffect(() => {
    const fetchSupaSignals = async () => {
      setIsLoadingDB(true);
      const supabase = createClient();
      
      let query = supabase
        .from('technical_signals')
        .select('symbol, signals, signal_date')
        .eq('timeframe', timeframe);

      // Logika Filter Tanggal menggunakan variabel primitif
      if (dateMode) {
        if (dateMode === 'single' && customDate) {
          query = query.lte('signal_date', customDate);
        } else if (dateMode === 'range' && startDate && endDate) {
          query = query.gte('signal_date', startDate).lte('signal_date', endDate);
        }
      }

      // Ambil lebih banyak data karena range mungkin mengembalikan banyak baris, urutkan tanggal terbaru di atas
      const { data, error } = await query.order('signal_date', { ascending: false }).limit(4000); 

      if (!error && data) {
        // Deduplikasi: Pastikan 1 Emiten hanya muncul 1 kali
        const uniqueMap = new Map<string, TechnicalSignal>();
        for (const item of data) {
          if (!uniqueMap.has(item.symbol)) {
            uniqueMap.set(item.symbol, item as TechnicalSignal);
          }
        }
        
        // Ubah kembali ke Array dan urutkan sesuai abjad emiten
        const uniqueData = Array.from(uniqueMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
        setSupaData(uniqueData);
      } else {
        setSupaData([]);
      }
      setIsLoadingDB(false);
    };

    fetchSupaSignals();
  }, [timeframe, dateMode, customDate, startDate, endDate]);

  const columnsConfig = LOGIC_CONFIG[activeCategory] || LOGIC_CONFIG["DEFAULT"];
  const jsonKey = CATEGORY_TO_JSON_KEY[activeCategory] || "";

  // Handle pergantian urutan saat header diklik (Default -> Desc -> Asc -> Default)
  const handleSort = (key: string, isDynamic: boolean) => {
    setSortConfig(current => {
      if (current.key === key) {
        if (current.direction === 'default') return { key, direction: 'desc', isDynamic };
        if (current.direction === 'desc') return { key, direction: 'asc', isDynamic };
        return { key: null, direction: 'default', isDynamic: false };
      }
      return { key, direction: 'desc', isDynamic };
    });
  };

  // Filter Data Gabungan (Pencarian) dan Eksekusi Sorting
  const filteredData = useMemo(() => {
    // 1. Eksekusi Search Terlebih Dahulu
    let data = supaData.filter(item => item.symbol.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Eksekusi Sorting
    const currentKey = sortConfig.key; // Simpan ke variabel lokal agar tidak null di dalam closure
    
    if (currentKey && sortConfig.direction !== 'default') {
      data = [...data].sort((a, b) => {
        // FIX ERROR: Mengganti tipe 'any' menjadi tipe eksplisit string | number
        let valA: string | number = '';
        let valB: string | number = '';

        if (!sortConfig.isDynamic) {
          if (currentKey === 'symbol') {
            valA = a.symbol;
            valB = b.symbol;
          } else if (currentKey === 'price') {
            valA = activePrices?.find(p => p.symbol === a.symbol)?.close || 0;
            valB = activePrices?.find(p => p.symbol === b.symbol)?.close || 0;
          }
        } else {
          // FIX ERROR: index type null diatasi karena 'currentKey' dijamin bertipe string
          const indicatorA = a.signals?.[jsonKey] || {};
          const indicatorB = b.signals?.[jsonKey] || {};
          valA = indicatorA[currentKey] ?? '';
          valB = indicatorB[currentKey] ?? '';
        }

        // Penanganan jika ada nilai kosong atau belum terhitung (Lempar ke bawah)
        const isEmptyA = valA === '' || valA === '-';
        const isEmptyB = valB === '' || valB === '-';

        if (isEmptyA && isEmptyB) return 0;
        if (isEmptyA) return 1; 
        if (isEmptyB) return -1;

        // Jika nilai adalah Angka
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortConfig.direction === 'desc' ? numB - numA : numA - numB;
        }

        // Jika nilai adalah String (Teks biasa)
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) return sortConfig.direction === 'desc' ? 1 : -1;
        if (strA > strB) return sortConfig.direction === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return data;
  }, [supaData, searchTerm, sortConfig, activePrices, jsonKey]);

  return (
    <div className="w-full h-full bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg">
      
      {/* HEADER WIDGET */}
      <div className="px-3 py-2 border-b border-[#2d2d2d] flex items-center justify-between shrink-0 bg-[#121212]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[#0ea5e9]"/>
            <h2 className="text-white text-[11px] font-bold tracking-wide">
              Data Scan: <span className="text-[#0ea5e9]">{activeCategory}</span>
              <span className="ml-2 text-[10px] text-neutral-500 font-normal">({timeframe})</span>
            </h2>
          </div>
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold border border-[#2d2d2d] px-2.5 py-0.5 rounded-full">
            {filteredData.length} Stocks
          </span>
        </div>

        {/* KOLOM PENCARIAN TERINTEGRASI */}
        <div className="relative">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Cari emiten..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-full py-1 pl-7 pr-3 text-[10px] text-white font-medium outline-none focus:border-[#10b981] transition-colors w-[120px]"
          />
        </div>
      </div>

      {/* HEADER KOLOM TABEL DINAMIS */}
      <div className="grid grid-cols-[1.5fr_1.3fr_1.2fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-400 shrink-0 bg-[#1e1e1e]/50 tracking-wider">
        <SortableHeader 
          label="Symbol" 
          sortKey="symbol" 
          currentSort={sortConfig} 
          onSort={handleSort} 
        />
        <SortableHeader 
          label="Price" 
          align="right" 
          sortKey="price" 
          currentSort={sortConfig} 
          onSort={handleSort} 
        />
        {columnsConfig.map((col, idx) => (
          <SortableHeader 
            key={idx} 
            label={col.label} 
            align={col.align} 
            sortKey={col.key} 
            isDynamic={true} 
            currentSort={sortConfig} 
            onSort={handleSort} 
          />
        ))}
      </div>
      
      {/* BODY LIST DATA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212]">
        {isLoadingDB ? (
          <div className="flex justify-center items-center h-full text-[#10b981] animate-pulse text-[10px] font-bold">
            <div className="flex flex-col items-center gap-2">
               <div className="w-6 h-6 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin"></div>
               Menyelaraskan Data Market...
            </div>
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((item, idx) => {
            // Ambil Info Perusahaan dari Zustand Store
            const companyInfo = getCompany(item.symbol);
            
            // Cek harga dari GoAPI SWR (jika tersedia)
            const livePriceData = activePrices?.find(p => p.symbol === item.symbol);
            const currentPrice = livePriceData?.close || 0;
            const changePct = livePriceData?.percent ?? livePriceData?.change_pct ?? 0;
            const isUp = changePct >= 0;
            const colorClass = currentPrice === 0 ? "text-neutral-600" : (isUp ? "text-[#10b981]" : "text-[#ef4444]");

            // Ambil data teknikal dari JSON Supabase
            const indicatorData = item.signals?.[jsonKey] || {};

            return (
              <div 
                key={idx} 
                onClick={() => setGlobalSymbol(item.symbol)}
                className={`grid grid-cols-[1.5fr_1.3fr_1.2fr_1fr_1fr_1fr] gap-2 items-center px-3 py-2.5 border-b border-[#2d2d2d]/30 hover:bg-[#1e1e1e] transition-colors group cursor-pointer ${globalSymbol === item.symbol ? 'border-l-2 border-l-[#10b981] bg-[#1e1e1e]' : 'border-l-2 border-l-transparent'}`}
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
                
                {/* Kolom 2: Price (Real-time atau Kosong jika tidak masuk list aktif) */}
                <div className="flex flex-col items-end justify-center tabular-nums">
                  <span className={`font-semibold text-[11px] ${currentPrice === 0 ? "text-neutral-600" : "text-white"}`}>
                    {currentPrice > 0 ? currentPrice.toLocaleString('id-ID') : '-'}
                  </span>
                  <span className={`text-[9px] font-bold ${colorClass}`}>
                    {currentPrice > 0 ? `${isUp ? '+' : ''}${changePct.toFixed(2)}%` : '-'}
                  </span>
                </div>

                {/* Kolom Dinamis (3-6) Hasil Kalkulasi VPS */}
                {columnsConfig.map((col, cIdx) => {
                  const rawVal = indicatorData[col.key];
                  const val = rawVal !== undefined ? rawVal : '-';
                  const isBadgeCol = col.key === 'status' || col.key === 'trend' || col.key === 'cross' || col.key === 'zone';

                  return (
                    <div key={cIdx} className={`flex ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'} items-center`}>
                      {isBadgeCol ? (
                        renderBadge(String(val))
                      ) : (
                        <span className="text-neutral-300 text-[10.5px] font-semibold font-mono tracking-tight">
                           {typeof val === 'number' 
                             ? (col.key.includes('vol') ? val.toLocaleString('id-ID') : val.toLocaleString('id-ID', { maximumFractionDigits: 2 })) 
                             : val}
                        </span>
                      )}
                    </div>
                  );
                })}

              </div>
            );
          })
        ) : (
           <div className="flex flex-col justify-center items-center h-full text-neutral-500 gap-1">
              <span className="text-[11px] font-bold text-white">Data tidak ditemukan</span>
              <span className="text-[9px] px-8 text-center">Pastikan bot Python VPS Anda telah diatur untuk timeframe dan tanggal ini.</span>
           </div>
        )}
      </div>

    </div>
  );
}