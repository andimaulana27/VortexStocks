"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { 
  Flame, TrendingUp, TrendingDown, Activity, 
  CircleDollarSign, Target, Zap, ArrowLeft, Search,
  Loader2, AlertCircle, ShieldCheck, PieChart
} from 'lucide-react';

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface PresetStrategy {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  source: 'goapi-direct' | 'goapi-index'; 
  endpoint: string; 
}

// Tipe data final yang akan dirender ke dalam tabel
interface StockResult {
  symbol: string;
  close: number;
  change: number;
  percent: number; 
  company?: {
    name: string;
    logo?: string;
  };
}

// Tipe data mentah dari GoAPI untuk mengatasi error "Unexpected any"
interface RawStockData {
  symbol: string;
  close: number;
  change: number;
  change_pct?: number; // Diberikan oleh endpoint /prices
  percent?: number;    // Diberikan oleh endpoint /trending, /top_gainer
  company?: {
    name: string;
    logo?: string;
  };
}

// ==========================================
// DATA PRESET STRATEGI (100% REAL DATA GOAPI)
// ==========================================
const PRESET_STRATEGIES: PresetStrategy[] = [
  // 1. Direct API Endpoints
  { id: 'trending', title: 'Trending Stocks', desc: 'Saham yang sedang ramai diperbincangkan hari ini.', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'hover:border-orange-500/50', source: 'goapi-direct', endpoint: 'stock/idx/trending' },
  { id: 'top_gainer', title: 'Top Gainers', desc: 'Saham dengan persentase kenaikan harga tertinggi.', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50', source: 'goapi-direct', endpoint: 'stock/idx/top_gainer' },
  { id: 'top_loser', title: 'Top Losers', desc: 'Saham dengan penurunan harga terdalam.', icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/50', source: 'goapi-direct', endpoint: 'stock/idx/top_loser' },
  
  // 2. Index Based Endpoints
  { id: 'lq45', title: 'LQ45 Bluechips', desc: '45 Saham paling likuid dengan kapitalisasi pasar besar.', icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/50', source: 'goapi-index', endpoint: 'LQ45' },
  { id: 'jii', title: 'Syariah Gems (JII)', desc: '30 Saham syariah paling likuid di Bursa Efek Indonesia.', icon: ShieldCheck, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'hover:border-teal-500/50', source: 'goapi-index', endpoint: 'JII' },
  { id: 'idxhidiv20', title: 'High Dividend 20', desc: '20 Saham yang rutin membagikan dividen dengan yield tinggi.', icon: CircleDollarSign, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'hover:border-yellow-500/50', source: 'goapi-index', endpoint: 'IDXHIDIV20' },
  { id: 'idx30', title: 'IDX30 Core', desc: '30 Saham pilihan utama yang menjadi penggerak bursa.', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/50', source: 'goapi-index', endpoint: 'IDX30' },
  { id: 'smc_liq', title: 'SMC Liquid', desc: 'Saham lapis kedua & ketiga (Small-Mid Cap) paling likuid.', icon: Zap, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'hover:border-fuchsia-500/50', source: 'goapi-index', endpoint: 'IDXSMC-LIQ' },
  { id: 'idx80', title: 'IDX80 Universe', desc: '80 Saham teratas penggerak pasar reguler.', icon: PieChart, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/50', source: 'goapi-index', endpoint: 'IDX80' },
];

// ==========================================
// FETCHER MELALUI PROXY INTERNAL NEXT.JS
// ==========================================
const hybridFetcher = async ([source, endpoint]: [string, string]) => {
  try {
    // 1. Fetching Endpoint Langsung (Trending, Gainer, Loser)
    if (source === 'goapi-direct') {
      const res = await fetch(`/api/market?endpoint=${endpoint}`);
      if (!res.ok) throw new Error(`Proxy Error: ${res.status}`);
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.message || 'Gagal memuat API Langsung');
      return data;
    } 
    
    // 2. Trik "Akali" Index (Kombinasi list saham Index -> Tarik harganya)
    if (source === 'goapi-index') {
      // Step A: Ambil list isi indeks tersebut
      const indexRes = await fetch(`/api/market?endpoint=stock/idx/index/${endpoint}/items`);
      const indexData = await indexRes.json();
      
      if (!indexRes.ok || indexData.status !== 'success') {
        console.error(`[GoAPI Error] Gagal memuat indeks ${endpoint}:`, indexData);
        throw new Error(`Data Indeks ${endpoint} tidak ditemukan atau penulisan kode salah.`);
      }
      
      if (!indexData.data?.results || indexData.data.results.length === 0) {
        return { status: 'success', data: { results: [] } };
      }

      // Step B: Ambil maksimal 50 saham pertama (limit API GoAPI Prices)
      const symbolsStr = indexData.data.results.slice(0, 50).join(',');
      
      // Step C: Fetch detail harga berdasarkan array symbol
      const priceRes = await fetch(`/api/market?endpoint=stock/idx/prices&symbols=${symbolsStr}`);
      const priceData = await priceRes.json();

      if (!priceRes.ok || priceData.status !== 'success') {
        console.error(`[GoAPI Error] Gagal memuat harga indeks ${endpoint}:`, priceData);
        throw new Error(`Gagal mengambil harga saham untuk indeks ${endpoint}.`);
      }
      
      // Step D: Normalisasi field (Mengganti 'any' menjadi RawStockData)
      const formattedResults: StockResult[] = (priceData.data?.results || []).map((item: RawStockData) => ({
        symbol: item.symbol,
        close: item.close,
        change: item.change,
        // Gunakan change_pct dari /prices, atau percent dari endpoint lain, fallback ke 0
        percent: item.change_pct ?? item.percent ?? 0, 
        company: item.company
      }));

      // Di-sort berdasarkan persentase kenaikan tertinggi (Bebas dari 'any')
      formattedResults.sort((a: StockResult, b: StockResult) => b.percent - a.percent);

      return { status: 'success', data: { results: formattedResults } };
    }
  } catch (err) {
    console.error("Hybrid Fetcher Error:", err);
    throw err; 
  }
};

// ==========================================
// SUB-KOMPONEN: TABEL HASIL
// ==========================================
const ScreenerResultTable = ({ activeData }: { activeData: PresetStrategy }) => {
  const { data, error, isLoading } = useSWR(
    activeData ? [activeData.source, activeData.endpoint] : null, 
    hybridFetcher, 
    { 
      revalidateOnFocus: true, 
      dedupingInterval: 15000 // Cache 15 detik
    }
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mt-4">
        <Loader2 size={32} className="text-[#10b981] animate-spin mb-4" />
        <p className="text-neutral-400 text-sm font-medium animate-pulse">Menarik data live dari BEI...</p>
      </div>
    );
  }

  if (error || data?.status !== 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mt-4 text-rose-500 bg-[#ef4444]/10 rounded-xl border border-[#ef4444]/20 p-6">
        <AlertCircle size={32} className="mb-4" />
        <p className="text-sm font-bold text-center mb-2">Gagal Memuat Data</p>
        <p className="text-[11px] text-rose-400 max-w-sm text-center">
          {error?.message || "Pastikan kode indeks sudah didukung oleh GoAPI."} Silakan cek console browser (F12) untuk detail error.
        </p>
      </div>
    );
  }

  const results: StockResult[] = data?.data?.results || [];

  return (
    <div className="flex-1 overflow-auto custom-tv-scroll mt-4 rounded-xl border border-[#2d2d2d]">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#1e1e1e] sticky top-0 z-10 shadow-md">
          <tr>
            <th className="py-3 px-4 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Saham</th>
            <th className="py-3 px-4 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d] text-right">Harga</th>
            <th className="py-3 px-4 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d] text-right">Perubahan</th>
            <th className="py-3 px-4 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d] text-right">% Berubah</th>
            <th className="py-3 px-4 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d] text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2d2d2d] bg-[#121212]">
          {results.length === 0 ? (
             <tr>
               <td colSpan={5} className="py-10 text-center text-neutral-500 text-sm font-medium bg-[#1e1e1e]/20 border-dashed border-b border-[#2d2d2d]">
                 Tidak ada saham yang memenuhi kriteria <span className="text-white font-bold">{activeData.title}</span> saat ini.
               </td>
             </tr>
          ) : (
            results.map((item: StockResult, idx: number) => {
              const isPos = item.change > 0;
              const isNeg = item.change < 0;
              const colorClass = isPos ? 'text-[#10b981]' : isNeg ? 'text-[#ef4444]' : 'text-neutral-400';
              const sign = isPos ? '+' : '';

              return (
                <tr key={`${item.symbol}-${idx}`} className="hover:bg-[#1e1e1e]/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white shrink-0 border border-[#2d2d2d]">
                        {item.company?.logo ? (
                          <Image src={item.company.logo} alt={item.symbol} width={32} height={32} className="object-contain" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-black font-bold text-[10px]">{item.symbol.substring(0, 2)}</div>
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{item.symbol}</p>
                        <p className="text-[11px] text-neutral-500 truncate max-w-[150px]">{item.company?.name || "Bursa Efek Indonesia"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-[13px] font-bold text-white">{item.close?.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-[13px] font-bold ${colorClass}`}>{sign}{item.change?.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${isPos ? 'bg-[#10b981]/20 text-[#10b981]' : isNeg ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-neutral-800 text-neutral-400'}`}>
                      {sign}{item.percent?.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button className="px-3 py-1.5 bg-[#1e1e1e] border border-[#2d2d2d] rounded-md text-[11px] font-bold text-neutral-300 hover:text-white hover:border-[#10b981] transition-all">
                      Chart
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

// ==========================================
// KOMPONEN UTAMA PRESET SCREENER
// ==========================================
const PresetScreener = () => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPresets = PRESET_STRATEGIES.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (selectedPreset) {
    const activeData = PRESET_STRATEGIES.find(p => p.id === selectedPreset);
    return (
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col w-full h-full shadow-lg p-4 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-[#2d2d2d] shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedPreset(null)}
              className="p-1.5 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-neutral-500 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className={`p-2 rounded-lg ${activeData?.bg}`}>
              {activeData && <activeData.icon size={20} className={activeData.color} />}
            </div>
            <div>
              <h2 className="text-white font-bold text-[15px]">{activeData?.title}</h2>
              <p className="text-neutral-500 text-[11px]">{activeData?.desc}</p>
            </div>
          </div>
          <button className="px-4 py-1.5 bg-[#1e1e1e] border border-[#2d2d2d] text-white text-[11px] font-bold rounded-lg hover:border-[#10b981] transition-colors">
            Export to Excel
          </button>
        </div>
        
        {activeData && <ScreenerResultTable activeData={activeData} />}
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col w-full h-full shadow-lg p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Preset Screener</h2>
          <p className="text-neutral-500 text-[13px] mt-1">Gunakan preset filter siap pakai berdasarkan data bursa secara realtime.</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Cari strategi..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-[12px] bg-[#1e1e1e] border border-[#2d2d2d] rounded-full text-white placeholder-neutral-500 focus:outline-none focus:border-[#10b981] transition-colors w-[250px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-tv-scroll pb-4">
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setSelectedPreset(preset.id)}
            className={`flex flex-col text-left bg-[#1e1e1e]/60 border border-[#2d2d2d] p-5 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${preset.border} group cursor-pointer`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${preset.bg} group-hover:scale-110 transition-transform duration-300`}>
              <preset.icon size={24} className={preset.color} />
            </div>
            <h3 className="text-white font-bold text-[14px] mb-1.5">{preset.title}</h3>
            <p className="text-neutral-500 text-[11px] leading-relaxed line-clamp-2">
              {preset.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetScreener;