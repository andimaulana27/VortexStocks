// layout.tsx (Wrapper untuk menu layout & tabs)
"use client";

import React, { useState, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar } from 'lucide-react';

// --- 1. MEMBUAT CONTEXT TANGGAL GLOBAL UNTUK SEMUA TAB ---
export interface LayoutDateProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

export const LayoutDateContext = createContext<LayoutDateProps>({});
export const useLayoutDate = () => useContext(LayoutDateContext);

// --- HELPER TANGGAL ---
const getDefaultApiDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

// Konfigurasi Tab Switcher dengan Kombinasi Gradient Berbeda-beda
const TABS = [
  { 
    path: '/layout', 
    label: 'Default', 
    activeColor: 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white border-transparent shadow-[0_0_12px_rgba(168,85,247,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/fundamental', 
    label: 'Fundamental', 
    activeColor: 'bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-white border-transparent shadow-[0_0_12px_rgba(59,130,246,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/bandarmologi', 
    label: 'Bandarmologi Matrix', 
    activeColor: 'bg-gradient-to-r from-[#10b981] to-[#14b8a6] text-white border-transparent shadow-[0_0_12px_rgba(16,185,129,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/multi-chart', 
    label: 'Multi-Chart Center', 
    activeColor: 'bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white border-transparent shadow-[0_0_12px_rgba(249,115,22,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/custom', 
    label: 'Custom', 
    activeColor: 'bg-gradient-to-r from-[#e11d48] to-[#f43f5e] text-white border-transparent shadow-[0_0_12px_rgba(225,29,72,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  }
];

export default function LayoutSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // --- 2. STATE MANAJEMEN TANGGAL ---
  const [dateMode, setDateMode] = useState<'single' | '1w' | '1m' | '1y' | 'custom'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultApiDate());
  const [startDate, setStartDate] = useState<string>(getDefaultApiDate());
  const [endDate, setEndDate] = useState<string>(getDefaultApiDate());
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  // --- 3. HANDLER TANGGAL ---
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

  // Bungkus state ke dalam object Context
  const dateProps: LayoutDateProps = {
    customDate: selectedDate, 
    dateMode: dateMode === 'single' ? 'single' : 'range', 
    startDate: startDate,
    endDate: endDate
  };

  return (
    // --- 4. PROVIDER BUNGKUSAN ---
    <LayoutDateContext.Provider value={dateProps}>
      <div className="flex flex-col h-[calc(100vh-42px)] p-2 overflow-hidden bg-[#121212]">
        
        {/* --- HEADER (TABS & DATE PICKER) --- */}
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0 w-full overflow-x-auto hide-scrollbar pb-1">
          
          {/* BAGIAN KIRI: TAB SWITCHER */}
          <div className="flex items-center gap-2">
            {TABS.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 border whitespace-nowrap ${
                    isActive ? tab.activeColor : tab.inactiveColor
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* BAGIAN KANAN: DATE PICKER GLOBAL */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {/* Toggle Preset */}
            <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#2d2d2d] items-center">
              <button onClick={() => handleModeChange('single')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === 'single' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Single</button>
              <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
              <button onClick={() => handleModeChange('1w')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === '1w' ? 'bg-[#10b981]/20 text-[#10b981] shadow-sm' : 'text-neutral-500 hover:text-white'}`}>1W</button>
              <button onClick={() => handleModeChange('1m')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === '1m' ? 'bg-[#3b82f6]/20 text-[#3b82f6] shadow-sm' : 'text-neutral-500 hover:text-white'}`}>1M</button>
              <button onClick={() => handleModeChange('1y')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === '1y' ? 'bg-[#f59e0b]/20 text-[#f59e0b] shadow-sm' : 'text-neutral-500 hover:text-white'}`}>1Y</button>
              <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
              <button onClick={() => handleModeChange('custom')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === 'custom' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Custom</button>
            </div>

            {/* Input Tanggal */}
            {dateMode === 'single' ? (
              <div onClick={() => handleOpenDatePicker(dateInputRef)} className="relative flex items-center gap-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5 hover:border-[#10b981] transition-all duration-300 shadow-sm cursor-pointer group">
                <Calendar size={14} className="text-[#10b981] group-hover:scale-110 transition-transform duration-300" />
                <input ref={dateInputRef} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[110px]" max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} />
              </div>
            ) : (
              <div className={`flex items-center gap-2 bg-[#1e1e1e] border rounded-lg px-3 py-1.5 shadow-sm transition-colors ${dateMode === 'custom' ? 'border-[#3b82f6]' : 'border-[#2d2d2d]'}`}>
                <div onClick={() => handleOpenDatePicker(startDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981] transition-colors">
                  <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                  <input ref={startDateInputRef} type="date" value={startDate} onChange={handleStartDateChange} className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[100px]" max={endDate} onClick={(e) => e.stopPropagation()} />
                </div>
                <span className="text-neutral-500 text-[10px] font-bold">-</span>
                <div onClick={() => handleOpenDatePicker(endDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981] transition-colors">
                  <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                  <input ref={endDateInputRef} type="date" value={endDate} onChange={handleEndDateChange} className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[100px]" min={startDate} max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- AREA RENDER HALAMAN ANAK (pages) --- */}
        <div className="flex-1 overflow-hidden rounded-lg">
          {children}
        </div>

        {/* STYLE CSS KHUSUS INPUT DATE */}
        <style dangerouslySetInnerHTML={{__html: `
          .custom-date-input::-webkit-calendar-picker-indicator {
              opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: pointer;
          }
          .custom-date-input { position: relative; }
        `}} />
      </div>
    </LayoutDateContext.Provider>
  );
}