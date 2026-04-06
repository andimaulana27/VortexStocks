"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { 
  Flame, TrendingUp, TrendingDown, Globe, Activity, 
  CircleDollarSign, Target, Zap, ArrowLeft, Search,
  Loader2, AlertCircle
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
  source: 'goapi' | 'supabase' | 'mock'; // Tambahkan 'mock' sebagai sumber data
  endpoint?: string; 
}

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

// ==========================================
// DUMMY DATA GENERATOR (MOCK)
// ==========================================
const getMockData = (type: string) => {
  const mockDatabase: Record<string, StockResult[]> = {
    'foreign_flow': [
      { symbol: 'BBCA', close: 9800, change: 125, percent: 1.29, company: { name: 'Bank Central Asia Tbk.', logo: 'https://s3.goapi.io/logo/BBCA.jpg' } },
      { symbol: 'BMRI', close: 7250, change: 100, percent: 1.39, company: { name: 'Bank Mandiri (Persero) Tbk.', logo: 'https://s3.goapi.io/logo/BMRI.jpg' } },
      { symbol: 'AMMN', close: 8850, change: 250, percent: 2.90, company: { name: 'Amman Mineral Internasional Tbk.', logo: 'https://s3.goapi.io/logo/AMMN.jpg' } },
    ],
    'golden_cross': [
      { symbol: 'BRPT', close: 1020, change: 45, percent: 4.61, company: { name: 'Barito Pacific Tbk.', logo: 'https://s3.goapi.io/logo/BRPT.jpg' } },
      { symbol: 'PGEO', close: 1210, change: 30, percent: 2.54, company: { name: 'Pertamina Geothermal Energy Tbk.', logo: 'https://s3.goapi.io/logo/PGEO.jpg' } },
      { symbol: 'MDKA', close: 2450, change: 80, percent: 3.37, company: { name: 'Merdeka Copper Gold Tbk.', logo: 'https://s3.goapi.io/logo/MDKA.jpg' } },
    ],
    'smart_money': [
      { symbol: 'BREN', close: 5400, change: 200, percent: 3.84, company: { name: 'Barito Renewables Energy Tbk.', logo: 'https://s3.goapi.io/logo/BREN.jpg' } },
      { symbol: 'CUAN', close: 6700, change: 350, percent: 5.51, company: { name: 'Petrindo Jaya Kreasi Tbk.', logo: 'https://s3.goapi.io/logo/CUAN.jpg' } },
    ],
    'canslim': [
      { symbol: 'SIDO', close: 745, change: 15, percent: 2.05, company: { name: 'Industri Jamu dan Farmasi Sido Muncul Tbk.', logo: 'https://s3.goapi.io/logo/SIDO.jpg' } },
      { symbol: 'MYOR', close: 2560, change: 40, percent: 1.58, company: { name: 'Mayora Indah Tbk.', logo: 'https://s3.goapi.io/logo/MYOR.jpg' } },
      { symbol: 'ICBP', close: 11200, change: 150, percent: 1.35, company: { name: 'Indofood CBP Sukses Makmur Tbk.', logo: 'https://s3.goapi.io/logo/ICBP.jpg' } },
    ],
    'breakout': [
      { symbol: 'MEDC', close: 1450, change: 75, percent: 5.45, company: { name: 'Medco Energi Internasional Tbk.', logo: 'https://s3.goapi.io/logo/MEDC.jpg' } },
      { symbol: 'ENRG', close: 234, change: 12, percent: 5.40, company: { name: 'Energi Mega Persada Tbk.', logo: 'https://s3.goapi.io/logo/ENRG.jpg' } },
      { symbol: 'DOID', close: 412, change: 22, percent: 5.64, company: { name: 'Delta Dunia Makmur Tbk.', logo: 'https://s3.goapi.io/logo/DOID.jpg' } },
    ]
  };

  return { status: 'success', data: { results: mockDatabase[type] || [] } };
};

// ==========================================
// DATA PRESET STRATEGI
// ==========================================
const PRESET_STRATEGIES: PresetStrategy[] = [
  { id: 'trending', title: 'Trending Stocks', desc: 'Saham yang sedang ramai diperbincangkan hari ini.', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'hover:border-orange-500/50', source: 'goapi', endpoint: 'https://api.goapi.io/stock/idx/trending' },
  { id: 'top_gainer', title: 'Top Gainers', desc: 'Saham dengan persentase kenaikan harga tertinggi.', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50', source: 'goapi', endpoint: 'https://api.goapi.io/stock/idx/top_gainer' },
  { id: 'top_loser', title: 'Top Losers', desc: 'Saham dengan penurunan harga terdalam.', icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/50', source: 'goapi', endpoint: 'https://api.goapi.io/stock/idx/top_loser' },
  
  // Menggunakan 'mock' agar UI tampil rapi tanpa error database
  { id: 'golden_cross', title: 'MACD Golden Cross', desc: 'Sinyal pembalikan arah tren ke Bullish (MACD > Signal).', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/50', source: 'mock' },
  { id: 'canslim', title: 'Uptrend / CANSLIM', desc: 'Saham dalam tren naik kuat (Close > MA20 > MA50 > MA200).', icon: Target, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'hover:border-cyan-500/50', source: 'mock' },
  { id: 'breakout', title: 'Bollinger Breakout', desc: 'Harga menembus Upper Bollinger Band.', icon: Zap, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'hover:border-fuchsia-500/50', source: 'mock' },
  { id: 'smart_money', title: 'Oversold Reversal', desc: 'Saham jenuh jual yang mulai berbalik arah (RSI < 40 & MACD Hijau).', icon: CircleDollarSign, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'hover:border-yellow-500/50', source: 'mock' },
  { id: 'foreign_flow', title: 'High Volume Liquid', desc: 'Saham likuid dengan volume di atas 50 Juta lembar.', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/50', source: 'mock' },
];

// ==========================================
// FETCHER HYBRID (API & MOCK)
// ==========================================
const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';

const hybridFetcher = async ([source, endpoint, id]: [string, string | undefined, string]) => {
  try {
    // 1. Fetch langsung dari GoAPI
    if (source === 'goapi' && endpoint) {
      const res = await fetch(endpoint, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } });
      if (!res.ok) throw new Error(`GoAPI Error: ${res.status}`);
      return await res.json();
    } 
    
    // 2. Gunakan Data Dummy untuk sementara
    if (source === 'mock') {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(getMockData(id));
        }, 800); // Simulasi delay internet 0.8 detik
      });
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
    activeData ? [activeData.source, activeData.endpoint, activeData.id] : null, 
    hybridFetcher, 
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mt-4">
        <Loader2 size={32} className="text-[#10b981] animate-spin mb-4" />
        <p className="text-neutral-400 text-sm font-medium animate-pulse">Menyaring saham...</p>
      </div>
    );
  }

  if (error || data?.status !== 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mt-4 text-rose-500 bg-[#ef4444]/10 rounded-xl border border-[#ef4444]/20 p-6">
        <AlertCircle size={32} className="mb-4" />
        <p className="text-sm font-bold text-center">Gagal Memuat Data</p>
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
          <p className="text-neutral-500 text-[13px] mt-1">Gunakan formula siap pakai berdasarkan Engine Analisis VorteStocks.</p>
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