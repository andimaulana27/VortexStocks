// src/app/(protected)/combination/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Search, ChevronDown, Calendar } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Global Store untuk mengambil 900+ Saham
import { useCompanyStore } from '@/store/useCompanyStore';

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

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W", "1M"];

// Helper Tanggal Default
const getDefaultApiDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

// Interface untuk menangkap Object dari Python
interface IndicatorData {
  status?: string;
  [key: string]: string | number | undefined;
}

export default function CombinationPage() {
  const [configuredIndicators, setConfiguredIndicators] = useState<{id: string, name: string}[]>([]);
  const [currentSignals, setCurrentSignals] = useState<Record<string, IndicatorData>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State untuk Custom Combobox / Search Emiten
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- STATE MANAJEMEN TANGGAL DENGAN PRESET ---
  const [dateMode, setDateMode] = useState<'single' | '1w' | '1m' | '1y' | 'custom'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultApiDate());
  const [startDate, setStartDate] = useState<string>(getDefaultApiDate());
  const [endDate, setEndDate] = useState<string>(getDefaultApiDate());
  const [activeTimeframe, setActiveTimeframe] = useState("1D");

  const dateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  // --- Integrasi Global Store (FIXED: Tambah fetchCompanies) ---
  const companies = useCompanyStore(state => state.companies);
  const fetchCompanies = useCompanyStore(state => state.fetchCompanies);
  const activeSymbol = useCompanyStore(state => state.activeSymbol);
  const setActiveSymbol = useCompanyStore(state => state.setActiveSymbol);
  
  // Pastikan data perusahaan ditarik saat komponen dimuat
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Mengubah Object companies menjadi Array urut Abjad
  const availableSymbols = Object.keys(companies).sort();

  // Filter emiten berdasarkan pencarian
  const filteredSymbols = useMemo(() => {
    if (!searchQuery) return availableSymbols;
    return availableSymbols.filter(sym => sym.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [availableSymbols, searchQuery]);
  
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

  // 2. Ambil Sinyal dari Database berdasarkan Saham, Tanggal, & Timeframe
  const fetchSignals = async () => {
    setIsRefreshing(true);
    const supabase = createClient();
    
    let query = supabase
      .from('technical_signals')
      .select('signals')
      .eq('symbol', activeSymbol) 
      .eq('timeframe', activeTimeframe);

    // FIX: Menerapkan logika filter rentang tanggal menggunakan .lte agar fallback ke tanggal terbaru aman
    if (dateMode === 'single') {
      query = query.lte('signal_date', selectedDate);
    } else {
      query = query.gte('signal_date', startDate).lte('signal_date', endDate);
    }

    // Menggunakan .limit(1) dengan mengurutkan tanggal terbaru
    const { data, error } = await query.order('signal_date', { ascending: false }).limit(1);

    if (!error && data && data.length > 0 && data[0].signals) {
      setCurrentSignals(data[0].signals as Record<string, IndicatorData>);
    } else {
      // Jika data tidak ditemukan pada tanggal/range tersebut
      setCurrentSignals({});
    }
    
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Panggil fetchSignals setiap kali saham, tanggal, atau timeframe berubah
  useEffect(() => {
    if (activeSymbol) {
      fetchSignals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbol, activeTimeframe, dateMode, selectedDate, startDate, endDate]);

  // --- LOGIKA PERUBAHAN PRESET TANGGAL ---
  const handleOpenDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      try { ref.current.showPicker(); } catch { ref.current.focus(); }
    }
  };

  const handleModeChange = (mode: 'single' | '1w' | '1m' | '1y' | 'custom') => {
    setDateMode(mode);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    
    if (mode === '1w') {
      const start = new Date(); start.setDate(start.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (mode === '1m') {
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (mode === '1y') {
      const start = new Date(); start.setFullYear(start.getFullYear() - 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };
  
  // --- PACKING DATE PROPS UNTUK WIDGET ANAK ---
  const dateProps: {
    customDate: string;
    dateMode: 'single' | 'range';
    startDate: string;
    endDate: string;
  } = {
    customDate: selectedDate, 
    dateMode: dateMode === 'single' ? 'single' : 'range', 
    startDate: startDate,
    endDate: endDate
  };

  // Fungsi Helper Warna
  const getColorClasses = (status: string) => {
    switch(status) {
      case 'Buy': return { border: 'border-[#10b981]', bg: 'bg-[#10b981]' };
      case 'Sell': return { border: 'border-[#ef4444]', bg: 'bg-[#ef4444]' };
      case 'Wait': return { border: 'border-[#f97316]', bg: 'bg-[#f97316]' };
      default: return { border: 'border-neutral-500', bg: 'bg-neutral-500' };
    }
  };

  // Ekstrak status dari Object JSON
  const activeIndicatorsWithStatus = configuredIndicators.map(ind => {
    const indicatorObj = currentSignals[ind.id];
    const statusValue = indicatorObj?.status ? String(indicatorObj.status) : 'Wait';
    
    return {
      name: ind.name,
      status: statusValue
    };
  });

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
      
      {/* --- HEADER DENGAN DROPDOWN SAHAM, DATE PICKER, DAN TIMEFRAME --- */}
      <div className="flex justify-between items-center shrink-0 w-full overflow-x-auto hide-scrollbar gap-4 pb-1">
        
        {/* KIRI: Symbol Dropdown & Refresh */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Custom Searchable Dropdown Emiten */}
          <div className="relative w-[180px] z-50">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-neutral-500" />
              <input
                type="text"
                placeholder="Cari emiten..."
                value={isDropdownOpen ? searchQuery : activeSymbol}
                onChange={(e) => {
                  setSearchQuery(e.target.value.toUpperCase());
                  setIsDropdownOpen(true);
                }}
                onFocus={() => {
                  setSearchQuery("");
                  setIsDropdownOpen(true);
                }}
                onBlur={() => {
                  // Delay agar klik item dropdown tidak langsung hilang
                  setTimeout(() => setIsDropdownOpen(false), 200);
                }}
                onKeyDown={(e) => {
                  // FIX: Fungsi agar bisa menekan ENTER untuk memilih saham
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchQuery.trim() !== '') {
                      const matchedSymbol = filteredSymbols.find(sym => sym === searchQuery) || (filteredSymbols.length > 0 ? filteredSymbols[0] : null);
                      
                      if (matchedSymbol) {
                        setActiveSymbol(matchedSymbol);
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                        e.currentTarget.blur();
                      }
                    }
                  }
                }}
                className="bg-[#181818] border border-[#2d2d2d] text-white text-[11px] font-bold rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:border-[#10b981] hover:border-[#3d3d3d] transition-colors w-full shadow-sm cursor-text"
              />
              <ChevronDown 
                size={14} 
                className={`absolute right-3 text-neutral-500 pointer-events-none transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </div>

            {/* Dropdown List */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg shadow-2xl max-h-[250px] overflow-y-auto custom-scrollbar py-1">
                {filteredSymbols.length > 0 ? (
                  filteredSymbols.map(sym => (
                    <div
                      key={sym}
                      onClick={() => {
                        setActiveSymbol(sym);
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                      }}
                      className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-2 ${
                        activeSymbol === sym 
                          ? 'bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981]' 
                          : 'text-neutral-300 hover:bg-[#2d2d2d] hover:text-white border-l-2 border-transparent'
                      }`}
                    >
                      {sym}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-[11px] text-neutral-500 text-center font-medium">Emiten tidak ditemukan</div>
                )}
              </div>
            )}
          </div>
          
          {/* Tombol Refresh Manual */}
          <button 
            onClick={fetchSignals}
            className={`p-2 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] rounded-lg text-neutral-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin text-[#10b981]' : ''}`}
            title="Refresh Data Sinyal"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* KANAN: Date Picker & Timeframe */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          
          {/* Segmen Date Picker */}
          <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#2d2d2d] items-center">
            <button 
              onClick={() => handleModeChange('single')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === 'single' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Single
            </button>
            <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
            <button 
              onClick={() => handleModeChange('1w')} 
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === '1w' ? 'bg-[#10b981]/20 text-[#10b981] shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              1W
            </button>
            <button 
              onClick={() => handleModeChange('1m')} 
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === '1m' ? 'bg-[#3b82f6]/20 text-[#3b82f6] shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              1M
            </button>
            <button 
              onClick={() => handleModeChange('1y')} 
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === '1y' ? 'bg-[#f59e0b]/20 text-[#f59e0b] shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              1Y
            </button>
            <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
            <button 
              onClick={() => handleModeChange('custom')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === 'custom' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          {dateMode === 'single' ? (
            <div onClick={() => handleOpenDatePicker(dateInputRef)} className="relative flex items-center gap-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5 hover:border-[#10b981] transition-all duration-300 shadow-sm cursor-pointer group">
              <Calendar size={14} className="text-[#10b981] group-hover:scale-110 transition-transform duration-300" />
              <input 
                ref={dateInputRef} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[110px]"
                max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} 
              />
            </div>
          ) : (
            <div className={`flex items-center gap-2 bg-[#1e1e1e] border rounded-lg px-3 py-1.5 shadow-sm transition-colors ${dateMode === 'custom' ? 'border-[#3b82f6]' : 'border-[#2d2d2d]'}`}>
              <div onClick={() => handleOpenDatePicker(startDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981] transition-colors">
                <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                <input 
                  ref={startDateInputRef} type="date" value={startDate} onChange={handleStartDateChange}
                  className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[100px]"
                  max={endDate} onClick={(e) => e.stopPropagation()} 
                />
              </div>
              <span className="text-neutral-500 text-[10px] font-bold">-</span>
              <div onClick={() => handleOpenDatePicker(endDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981] transition-colors">
                <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                <input 
                  ref={endDateInputRef} type="date" value={endDate} onChange={handleEndDateChange}
                  className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[100px]"
                  min={startDate} max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} 
                />
              </div>
            </div>
          )}

          <div className="w-px h-6 bg-[#2d2d2d] shrink-0 hidden md:block rounded-full mx-1"></div>

          {/* Segmen Timeframe */}
          <div className="flex items-center gap-2 shrink-0">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 border ${
                  activeTimeframe === tf 
                    ? "bg-[#2d2d2d] text-white border-[#404040] shadow-[0_0_10px_rgba(255,255,255,0.05)]" 
                    : "bg-[#121212] text-neutral-500 border-[#2d2d2d] hover:text-white hover:border-[#3e3e3e]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

        </div>
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
          <BrokerSummaryWidget {...dateProps} />
        </div>
        <div className="flex flex-col flex-[1.1] gap-4 h-full min-h-[600px] lg:min-h-0">
          <div className="flex-1 min-h-0">
            <BrokerDistWidget {...dateProps} />
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
             <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#2d2d2d] rounded-xl py-8 bg-[#181818]/50">
                <span className="text-neutral-500 text-xs font-medium mb-2">Belum ada indikator teknikal yang diaktifkan.</span>
                <Link href="/settings" className="text-[#10b981] text-[11px] font-bold underline underline-offset-4 hover:text-[#059669] transition-colors">Konfigurasi di Settings</Link>
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

      <style dangerouslySetInnerHTML={{__html: `
        .custom-date-input::-webkit-calendar-picker-indicator {
            opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: pointer;
        }
        .custom-date-input { position: relative; }
      `}} />
    </div>
  );
}