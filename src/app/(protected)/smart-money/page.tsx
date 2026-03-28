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
  
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultApiDate());
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [selectedBrokers, setSelectedBrokers] = useState<string[]>(["AK", "YU", "ZP", "BK"]); 

  const toggleBroker = (code: string) => {
    setSelectedBrokers(prev => 
      prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]
    );
  };

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      try { dateInputRef.current.showPicker(); } catch { dateInputRef.current.focus(); }
    }
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

        <div onClick={handleOpenDatePicker} className="relative flex items-center gap-2 shrink-0 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5 ml-4 hover:border-[#10b981] transition-all duration-300 shadow-sm cursor-pointer group">
          <Calendar size={14} className="text-[#10b981] group-hover:scale-110 transition-transform duration-300" />
          <input 
            ref={dateInputRef} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[110px]"
            max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} 
          />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar mt-1">
        
        {/* TAB BROKSUM */}
        {activeCategory === "Broksum" ? (
          <div className="flex gap-2 h-full min-w-[1300px]"> 
            <div className="w-[480px] shrink-0 h-full overflow-hidden"><BrokerActivityWidget customDate={selectedDate} /></div>
            <div className="w-[350px] shrink-0 h-full overflow-hidden"><BrokerSummaryWidget customDate={selectedDate} /></div>
            <div className="w-[400px] shrink-0 h-full flex flex-col gap-2 overflow-hidden">
               <div className="flex-[0.6] overflow-hidden"><BrokerDistWidget customDate={selectedDate} /></div>
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
                <ForeignAccumulationTable selectedBrokers={selectedBrokers} customDate={selectedDate} />
              </div>
              <div className="w-[350px] shrink-0 h-full overflow-hidden rounded-xl border border-[#2d2d2d]">
                 <BrokerSummaryWidget customDate={selectedDate} />
              </div>
              <div className="w-[370px] shrink-0 h-full flex flex-col gap-2 overflow-hidden">
                <div className="flex-1 overflow-hidden rounded-xl border border-[#2d2d2d]"><BrokerDistWidget customDate={selectedDate} /></div>
                <div className="flex-[0.7] overflow-hidden rounded-xl border border-[#2d2d2d]"><TechnicalAnalysisWidget /></div>
              </div>
              <div className="flex-1 flex flex-col gap-2 h-full overflow-hidden min-w-[400px]">
                <div className="flex-[0.65] w-full overflow-hidden rounded-xl border border-[#2d2d2d]"><AdvancedChartWidget /></div>
                <div className="flex-[0.35] w-full overflow-hidden rounded-xl border border-[#2d2d2d]"><VolumeActivityWidget /></div>
              </div>
            </div>
          </div>

        /* TAB VOLUME (KINI MENERIMA CUSTOM DATE) */
        ) : activeCategory === "Volume" ? (
          <div className="h-full w-full"><VolumeScreenerWidget customDate={selectedDate} /></div>
          
        ) : activeCategory === "Smart Money" ? (
          <div className="h-full w-full"><SmartMoneyScreenerWidget /></div>
        ) : activeCategory === "Anomali Broker" ? (
          <div className="h-full w-full"><AnomaliBrokerWidget /></div>
        ) : activeCategory === "Top Acum" ? (
          <div className="h-full w-full"><TopAcumWidget /></div>
        ) : activeCategory === "Shareholders" ? (
          <div className="h-full w-full"><ShareholdersWidget /></div>
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