// src/app/(protected)/smart-money/page.tsx
"use client";

import React, { useState, useRef } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Calendar } from 'lucide-react';

// Import Widgets
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import RadarWidget from '@/components/layouts/RadarWidget';
import BrokerActivityWidget from '@/components/layouts/BrokerActivityWidget'; 
import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget'; 
import TechnicalAnalysisWidget from '@/components/dashboard/TechnicalAnalysisWidget'; 
import VolumeScreenerWidget from '@/components/layouts/VolumeScreenerWidget'; 
import SmartMoneyScreenerWidget from '@/components/layouts/SmartMoneyScreenerWidget'; 
import AnomaliBrokerWidget from '@/components/layouts/AnomaliBrokerWidget';
import TopAcumWidget from '@/components/layouts/TopAcumWidget';
import ShareholdersWidget from '@/components/layouts/ShareholdersWidget'; 

// Import Komponen Scan Akumulasi
import ForeignAccumulationTable from '@/components/layouts/ForeignAccumulationTable'; 

// Kategori Smart Money
const SMART_MONEY_CATEGORIES = [
  "Broksum", 
  "Foreign", 
  "Volume", 
  "Smart Money",
  "Anomali Broker",
  "Top Acum",
  "Shareholders"
];

// Daftar Broker Asing
const FOREIGN_BROKERS = [
  "AK", "YU", "YP", "ZP", "BK", "KZ", "CP", "KK", 
  "DR", "BQ", "TP", "XA", "HD", "AI", "RX"
];

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

export default function SmartMoneyStandalonePage() {
  useCompanyStore();
  const [activeCategory, setActiveCategory] = useState(SMART_MONEY_CATEGORIES[0]); 
  
  // --- STATE MANAJEMEN TANGGAL DENGAN PRESET ---
  // Mode sekarang memiliki 5 opsi
  const [dateMode, setDateMode] = useState<'single' | '1w' | '1m' | '1y' | 'custom'>('single');
  
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultApiDate());
  const [startDate, setStartDate] = useState<string>(getDefaultApiDate());
  const [endDate, setEndDate] = useState<string>(getDefaultApiDate());
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  const [selectedBrokers, setSelectedBrokers] = useState<string[]>(["AK", "YU", "ZP", "BK"]); 

  const toggleBroker = (code: string) => {
    setSelectedBrokers(prev => 
      prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]
    );
  };

  const handleOpenDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      try { ref.current.showPicker(); } catch { ref.current.focus(); }
    }
  };

  // --- LOGIKA PERUBAHAN PRESET TANGGAL ---
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

  // Jika user sedang di preset 1W/1M/1Y tapi mengubah tanggal manual, otomatis pindah ke mode 'custom'
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };

  // --- PROPS AJAIB UNTUK WIDGET ---
  // Widget di bawah hanya perlu tahu apakah ini 'single' atau 'range'.
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

  return (
    <div className="p-2 h-[calc(100vh-42px)] w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER */}
      <div className="flex items-center justify-between shrink-0 px-1 mt-1">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full">
          {SMART_MONEY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-[#10b981] to-[#0ea5e9] text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] border-transparent"
                  : "bg-[#121212] border border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* --- DATE PICKER SECTION DENGAN PRESET --- */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          
          {/* Toggle Preset Baru */}
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

          {/* Render Input Sesuai Mode */}
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

        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar mt-1">
        
        {/* TAB BROKSUM */}
        {activeCategory === "Broksum" ? (
          <div className="flex gap-2 h-full min-w-[1300px]"> 
            <div className="w-[480px] shrink-0 h-full overflow-hidden"><BrokerActivityWidget {...dateProps} /></div>
            <div className="w-[350px] shrink-0 h-full overflow-hidden"><BrokerSummaryWidget {...dateProps} /></div>
            <div className="w-[400px] shrink-0 h-full flex flex-col gap-2 overflow-hidden">
               <div className="flex-[0.6] overflow-hidden"><BrokerDistWidget {...dateProps} /></div>
               <div className="flex-[0.4] overflow-hidden"><TechnicalAnalysisWidget /></div>
            </div>
            <div className="flex-1 min-w-[350px] h-full flex flex-col gap-2 overflow-hidden">
               <div className="flex-[0.7] w-full overflow-hidden rounded-xl"><AdvancedChartWidget /></div>
               <div className="flex-[0.3] w-full overflow-hidden rounded-xl"><VolumeActivityWidget /></div>
            </div>
          </div>
          
        /* TAB FOREIGN */
        ) : activeCategory === "Foreign" ? (
          <div className="flex flex-col gap-2 h-full min-w-[1500px]">
            
            <div className="flex items-center gap-4 shrink-0 bg-[#121212] border border-[#2d2d2d] p-2 rounded-xl">
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar flex-1">
                {FOREIGN_BROKERS.map(b => {
                  const isSelected = selectedBrokers.includes(b);
                  return (
                    <button 
                      key={b} onClick={() => toggleBroker(b)}
                      className={`w-[34px] h-[34px] shrink-0 rounded-full text-[10px] font-black flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'bg-gradient-to-br from-[#ef4444] via-[#f43f5e] to-[#f97316] text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] border-transparent' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#ef4444] hover:text-[#ef4444]'
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 flex-1 overflow-hidden relative">
              <div className="w-[340px] shrink-0 h-full overflow-hidden rounded-xl border border-[#2d2d2d]">
                <ForeignAccumulationTable selectedBrokers={selectedBrokers} {...dateProps} />
              </div>
              <div className="w-[350px] shrink-0 h-full overflow-hidden rounded-xl border border-[#2d2d2d]">
                 <BrokerSummaryWidget {...dateProps} />
              </div>
              <div className="w-[370px] shrink-0 h-full flex flex-col gap-2 overflow-hidden">
                <div className="flex-1 overflow-hidden rounded-xl border border-[#2d2d2d]"><BrokerDistWidget {...dateProps} /></div>
                <div className="flex-[0.7] overflow-hidden rounded-xl border border-[#2d2d2d]"><TechnicalAnalysisWidget /></div>
              </div>
              <div className="flex-1 flex flex-col gap-2 h-full overflow-hidden min-w-[400px]">
                <div className="flex-[0.65] w-full overflow-hidden rounded-xl border border-[#2d2d2d]"><AdvancedChartWidget /></div>
                <div className="flex-[0.35] w-full overflow-hidden rounded-xl border border-[#2d2d2d]"><VolumeActivityWidget /></div>
              </div>
            </div>
          </div>

        /* TAB VOLUME */
        ) : activeCategory === "Volume" ? (
          <div className="h-full w-full"><VolumeScreenerWidget {...dateProps} /></div>
          
        /* TAB SMART MONEY */
        ) : activeCategory === "Smart Money" ? (
          <div className="h-full w-full">
             <SmartMoneyScreenerWidget {...dateProps} />
          </div>
          
        /* TAB ANOMALI BROKER */
        ) : activeCategory === "Anomali Broker" ? (
          <div className="h-full w-full"><AnomaliBrokerWidget {...dateProps} /></div>
          
        /* TAB TOP ACUM */
        ) : activeCategory === "Top Acum" ? (
          <div className="h-full w-full"><TopAcumWidget {...dateProps} /></div>
          
        /* TAB SHAREHOLDERS */
        ) : activeCategory === "Shareholders" ? (
          <div className="h-full w-full"><ShareholdersWidget {...dateProps} /></div>
          
        ) : (
          <div className="flex gap-2 h-full w-full">
            <div className="w-[300px] flex flex-col h-full shrink-0 overflow-hidden"><RadarWidget /></div>
            <div className="flex-1 flex flex-col h-full overflow-hidden border border-[#2d2d2d] rounded-xl bg-[#1e1e1e]/20 items-center justify-center">
               <p className="text-neutral-500 text-[12px] font-medium tracking-wide">
                 Modul <span className="text-white font-bold">{activeCategory}</span> sedang dalam tahap sinkronisasi data.
               </p>
            </div>
          </div>
        )}

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