// src/app/(protected)/combination/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import TechnicalAnalysisWidget from '@/components/dashboard/TechnicalAnalysisWidget';

// Mapping ID ke Label UI
const INDICATOR_MAPPING = [
  { id: 'ma_ema', label: 'Ma+Ema' }, { id: 'macd', label: 'Macd' }, { id: 'stoch_rsi', label: 'Stoch Rsi' },
  { id: 'rsi', label: 'RSI' }, { id: 'big_volume', label: 'Big Volume' }, { id: 'breakout_ch', label: 'Breakout Ch' },
  { id: 'trendline_atr', label: 'Trendline ATR' }, { id: 'dtfx_zone', label: 'DTFX Zone' }, { id: 'zig_zag', label: 'Zig-Zag Ch' },
  { id: 'money_flow', label: 'Money Flow' }, { id: 'atr_supertrend', label: 'ATR SuperTrend' }, { id: 'reversal', label: 'Reversal' },
  { id: 'trending_market', label: 'Trending Market' }, { id: 'swing_hl', label: 'Swing H/L' }, { id: 'rsi_multi', label: 'RSI Multi Lenght' },
  { id: 'buy_sell', label: 'Buy Sell' }, { id: 'swing_flow', label: 'Swing Flow' }, { id: 'cs_confirm', label: 'CS Confirm' },
  { id: 'aura', label: 'AURA' }, { id: 'super_trend', label: 'Super Trend' }
];

// Daftar 10 Saham yang diproses Python di Tahap 1
const AVAILABLE_SYMBOLS = ["BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "GOTO", "AMMN", "BRPT", "BREN"];

export default function CombinationPage() {
  const [configuredIndicators, setConfiguredIndicators] = useState<{id: string, name: string}[]>([]);
  const [currentSignals, setCurrentSignals] = useState<Record<string, string>>({});
  const [selectedSymbol, setSelectedSymbol] = useState("BBCA"); // Default Saham
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 1. Ambil Settingan Indikator User (Hanya berjalan 1x saat load)
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase.from('profiles').select('technical_settings').eq('id', user.id).single();
        
        if (!error && data?.technical_settings) {
          const settings = data.technical_settings as Record<string, boolean>;
          const filtered = INDICATOR_MAPPING
            .filter(ind => settings[ind.id] === true)
            .map(ind => ({ id: ind.id, name: ind.label }));
            
          setConfiguredIndicators(filtered);
        } else {
          // Default jika belum disetting
          setConfiguredIndicators([
            { id: 'ma_ema', name: 'Ma+Ema' }, { id: 'macd', name: 'Macd' }, { id: 'rsi', name: 'RSI' }
          ]);
        }
      }
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  // 2. Ambil Sinyal dari Database berdasarkan Saham yang dipilih
  const fetchSignals = async () => {
    setIsRefreshing(true);
    const supabase = createClient();
    
    // Ambil data JSON dari Python Backend di tabel technical_signals
    const { data, error } = await supabase
      .from('technical_signals')
      .select('signals')
      .eq('symbol', selectedSymbol)
      .eq('timeframe', '1D')
      .single();

    if (!error && data && data.signals) {
      setCurrentSignals(data.signals as Record<string, string>);
    } else {
      // Jika data tidak ditemukan untuk saham tersebut, reset ke kosong
      setCurrentSignals({});
    }
    
    setTimeout(() => setIsRefreshing(false), 500); // Efek visual loading sebentar
  };

  // Panggil fetchSignals setiap kali dropdown saham berubah
  useEffect(() => {
    fetchSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);
  
  // Fungsi Helper Warna
  const getColorClasses = (status: string) => {
    switch(status) {
      case 'Buy': return { border: 'border-[#10b981]', bg: 'bg-[#10b981]' };
      case 'Sell': return { border: 'border-[#ef4444]', bg: 'bg-[#ef4444]' };
      case 'Wait': return { border: 'border-[#f97316]', bg: 'bg-[#f97316]' };
      default: return { border: 'border-neutral-500', bg: 'bg-neutral-500' };
    }
  };

  // Gabungkan Indikator yang diatur User dengan Sinyal dari Database
  const activeIndicatorsWithStatus = configuredIndicators.map(ind => ({
    name: ind.name,
    // Jika sinyal ada di DB, gunakan itu. Jika belum ada (misal logic belum dibuat di Python), jadikan 'Wait'
    status: currentSignals[ind.id] || 'Wait'
  }));

  // Kalkulasi total
  const totalBuy = activeIndicatorsWithStatus.filter(i => i.status === 'Buy').length;
  const totalSell = activeIndicatorsWithStatus.filter(i => i.status === 'Sell').length;
  const totalWait = activeIndicatorsWithStatus.filter(i => i.status === 'Wait').length;

  if (isLoading) {
    return (
      <div className="flex h-full w-full bg-[#121212] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-[#121212] p-4 overflow-y-auto custom-scrollbar gap-4">
      
      {/* --- HEADER DENGAN DROPDOWN SAHAM --- */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {/* Dropdown Pemilih Saham */}
          <select 
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-[#181818] border border-[#2d2d2d] text-white text-xs font-bold rounded px-3 py-1.5 focus:outline-none focus:border-[#10b981] transition-colors cursor-pointer"
          >
            {AVAILABLE_SYMBOLS.map(sym => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
          
          {/* Tombol Refresh Manual */}
          <button 
            onClick={fetchSignals}
            className={`p-1.5 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] rounded text-neutral-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin text-[#10b981]' : ''}`}
            title="Refresh Data Sinyal"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] rounded text-xs font-bold text-neutral-300 transition-colors">
          <Calendar size={14} className="text-neutral-500" /> Waktu Saat Ini
        </button>
      </div>

      {/* --- BARIS 1: 3 KOLOM WIDGET --- */}
      <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[72vh] min-h-[700px] shrink-0">
        <div className="flex flex-col flex-[2.0] gap-4 h-full">
          <div className="flex-1 min-h-0">
            <AdvancedChartWidget />
          </div>
          <div className="h-[220px] shrink-0">
            <VolumeActivityWidget />
          </div>
        </div>
        <div className="flex-[1.1] h-full min-h-[600px] lg:min-h-0">
          <BrokerSummaryWidget />
        </div>
        <div className="flex flex-col flex-[1.1] gap-4 h-full min-h-[600px] lg:min-h-0">
          <div className="flex-1 min-h-0">
            <BrokerDistWidget />
          </div>
          <div className="h-[370px] shrink-0">
            <TechnicalAnalysisWidget />
          </div>
        </div>
      </div>

      {/* --- BARIS 2: TEKNIKAL LOGIC & SUMMARY (LIVE DATA) --- */}
      <div className="flex flex-col lg:flex-row gap-6 shrink-0 pt-4 pb-10">
        
        {/* Kiri: Grid Kolom Indikator Teknikal */}
        <div className="flex-1 transition-opacity duration-300" style={{ opacity: isRefreshing ? 0.5 : 1 }}>
          {activeIndicatorsWithStatus.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#2d2d2d] rounded-xl py-8">
                <span className="text-neutral-500 text-xs font-medium mb-2">Belum ada indikator teknikal yang diaktifkan.</span>
                <Link href="/settings" className="text-[#10b981] text-[11px] font-bold underline underline-offset-4">Konfigurasi di Settings</Link>
             </div>
          ) : (
             <div className="grid grid-cols-5 md:grid-cols-10 gap-x-2 gap-y-4">
                {activeIndicatorsWithStatus.map((indicator, idx) => {
                  const colors = getColorClasses(indicator.status);
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className={`border ${colors.border} rounded-full py-1.5 px-1 flex items-center justify-center text-center bg-transparent`}>
                        <span className="text-white text-[9px] font-bold truncate tracking-wide">
                          {indicator.name}
                        </span>
                      </div>
                      <div className={`${colors.bg} rounded-full py-1.5 px-1 flex items-center justify-center text-center shadow-md transition-colors duration-500`}>
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">
                          {indicator.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
             </div>
          )}
        </div>

        {/* Kanan: Summary Total Indikator */}
        <div className="w-full lg:w-[220px] shrink-0 flex flex-col justify-center gap-3 lg:pl-6 lg:border-l border-[#2d2d2d]">
          <div className="bg-[#10b981] rounded-full py-2.5 px-4 text-center shadow-[0_4px_12px_rgba(16,185,129,0.3)] opacity-90 transition-all duration-300">
            <span className="text-white text-sm font-bold">{totalBuy} Indicator BUY</span>
          </div>
          <div className="bg-[#ef4444] rounded-full py-2.5 px-4 text-center shadow-[0_4px_12px_rgba(239,68,68,0.3)] opacity-90 transition-all duration-300">
            <span className="text-white text-sm font-bold">{totalSell} Indicator SELL</span>
          </div>
          <div className="bg-[#f97316] rounded-full py-2.5 px-4 text-center shadow-[0_4px_12px_rgba(249,115,22,0.3)] opacity-90 transition-all duration-300">
            <span className="text-white text-sm font-bold">{totalWait} Indicator WAIT</span>
          </div>
        </div>

      </div>

    </div>
  );
}