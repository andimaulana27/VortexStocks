// src/app/(protected)/smart-money/page.tsx
"use client";

import React, { useState } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Search, Calendar } from 'lucide-react';

// Import Widgets
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import RadarWidget from '@/components/layouts/RadarWidget';
import BrokerActivityWidget from '@/components/layouts/BrokerActivityWidget'; 
import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget'; 
import TechnicalAnalysisWidget from '@/components/dashboard/TechnicalAnalysisWidget'; 
import TopBrokerTable from '@/components/dashboard/TopBrokerTable'; 
import VolumeScreenerWidget from '@/components/layouts/VolumeScreenerWidget'; 
import SmartMoneyScreenerWidget from '@/components/layouts/SmartMoneyScreenerWidget'; 
import AnomaliBrokerWidget from '@/components/layouts/AnomaliBrokerWidget'; // IMPORT BARU

// Kategori Smart Money
const SMART_MONEY_CATEGORIES = [
  "Broksum", 
  "Foreign", 
  "Volume", 
  "Smart Money",
  "Anomali Broker", // <- INI YANG KITA BUAT SEKARANG
  "Top Acum",
  "Shareholders"
];

// Daftar Broker Asing (Fixed List standard BEI)
const FOREIGN_BROKERS = [
  "AK", "YU", "YP", "ZP", "BK", "KZ", "CP", "KK", 
  "DR", "BQ", "TP", "XA", "HD", "AI", "RX"
];

export default function SmartMoneyStandalonePage() {
  const { activeSymbol: globalSymbol, setActiveSymbol } = useCompanyStore();
  // Default ke Anomali Broker untuk testing hasil baru kita
  const [activeCategory, setActiveCategory] = useState(SMART_MONEY_CATEGORIES[4]); 

  const [searchQuery, setSearchQuery] = useState(globalSymbol || "BUMI");
  const [prevSymbol, setPrevSymbol] = useState(globalSymbol || "BUMI");

  // State untuk Tab Foreign 
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>(["AK", "YU", "ZP", "BK"]); 
  const [dateRange] = useState("Feb 13, 2026 - Feb 13, 2026");

  if (globalSymbol !== prevSymbol) {
    setSearchQuery(globalSymbol);
    setPrevSymbol(globalSymbol);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSymbol(searchQuery.toUpperCase());
    }
  };

  const toggleBroker = (code: string) => {
    setSelectedBrokers(prev => 
      prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]
    );
  };

  return (
    <div className="p-2 h-[calc(100vh-42px)] w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER: Kategori & Search Bar */}
      <div className="flex items-center justify-between shrink-0 px-1 mt-1">
        
        {/* TABS KATEGORI */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
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
        
        {/* SEARCH BAR */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-neutral-500 text-[10px] font-semibold uppercase tracking-widest hidden md:inline-block">
            Active Symbol:
          </span>
          <form onSubmit={handleSearch} className="flex items-center relative">
            <Search size={13} className="absolute left-2.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol..."
              className="bg-[#121212] text-[#f59e0b] text-[11px] font-black uppercase tracking-widest pl-8 pr-3 py-1.5 rounded border border-[#2d2d2d] focus:outline-none focus:border-[#f59e0b] transition-all w-32 placeholder:text-neutral-600 placeholder:font-semibold"
            />
            <button type="submit" className="hidden">Search</button>
          </form>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar mt-1">
        
        {/* --- 1. VIEW KHUSUS "BROKSUM" --- */}
        {activeCategory === "Broksum" ? (
          <div className="flex gap-2 h-full min-w-[1300px]"> 
            <div className="w-[480px] shrink-0 h-full overflow-hidden"><BrokerActivityWidget /></div>
            <div className="w-[350px] shrink-0 h-full overflow-hidden"><BrokerSummaryWidget /></div>
            <div className="w-[400px] shrink-0 h-full flex flex-col gap-2 overflow-hidden">
               <div className="flex-[0.6] overflow-hidden"><BrokerDistWidget /></div>
               <div className="flex-[0.4] overflow-hidden"><TechnicalAnalysisWidget /></div>
            </div>
            <div className="flex-1 min-w-[350px] h-full flex flex-col gap-2 overflow-hidden">
               <div className="flex-[0.7] w-full overflow-hidden rounded-xl"><AdvancedChartWidget /></div>
               <div className="flex-[0.3] w-full overflow-hidden rounded-xl"><VolumeActivityWidget /></div>
            </div>
          </div>
          
        ) : activeCategory === "Foreign" ? (

          /* --- 2. VIEW KHUSUS "FOREIGN" --- */
          <div className="flex flex-col gap-2 h-full min-w-[1300px]">
            <div className="flex items-center gap-4 shrink-0 bg-[#121212] border border-[#2d2d2d] p-2 rounded-xl">
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar flex-1">
                {FOREIGN_BROKERS.map(b => {
                  const isSelected = selectedBrokers.includes(b);
                  return (
                    <button 
                      key={b} onClick={() => toggleBroker(b)}
                      className={`w-[34px] h-[34px] shrink-0 rounded-full text-[10px] font-black flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'bg-gradient-to-br from-[#ef4444] via-[#f43f5e] to-[#f97316] text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] border-transparent scale-105' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#ef4444] hover:text-[#ef4444]'
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-l border-[#2d2d2d] pl-4 shrink-0">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] rounded-lg text-[11px] font-bold text-neutral-300 transition-colors">
                  <Calendar size={14} className="text-neutral-500" /> {dateRange}
                </button>
              </div>
            </div>

            <div className="flex gap-2 flex-1 overflow-hidden">
              <div className="w-[450px] shrink-0 h-full overflow-hidden"><TopBrokerTable /></div>
              <div className="flex-1 flex flex-col gap-2 h-full overflow-hidden">
                <div className="flex-[0.45] w-full overflow-hidden rounded-xl"><AdvancedChartWidget /></div>
                <div className="flex-[0.25] w-full overflow-hidden rounded-xl"><VolumeActivityWidget /></div>
                <div className="flex-[0.3] flex gap-2 w-full overflow-hidden">
                  <div className="flex-1 overflow-hidden"><BrokerSummaryWidget /></div>
                  <div className="flex-1 overflow-hidden"><BrokerDistWidget /></div>
                  <div className="flex-1 overflow-hidden"><TechnicalAnalysisWidget /></div>
                </div>
              </div>
            </div>
          </div>

        ) : activeCategory === "Volume" ? (

          /* --- 3. VIEW KHUSUS "VOLUME" --- */
          <div className="h-full w-full">
             <VolumeScreenerWidget />
          </div>

        ) : activeCategory === "Smart Money" ? (

          /* --- 4. VIEW KHUSUS "SMART MONEY" --- */
          <div className="h-full w-full">
             <SmartMoneyScreenerWidget />
          </div>

        ) : activeCategory === "Anomali Broker" ? (

          /* --- 5. VIEW KHUSUS "ANOMALI BROKER" (BARU) --- */
          <div className="h-full w-full">
             <AnomaliBrokerWidget />
          </div>

        ) : (
          
          /* FALLBACK UNTUK TAB LAIN */
          <div className="flex gap-2 h-full w-full">
            <div className="w-[300px] flex flex-col h-full shrink-0 overflow-hidden">
               <RadarWidget />
            </div>
            <div className="flex-1 flex flex-col h-full overflow-hidden border border-[#2d2d2d] rounded-xl bg-[#1e1e1e]/20 items-center justify-center">
               <p className="text-neutral-500 text-[12px] font-medium tracking-wide">
                 Modul <span className="text-white font-bold">{activeCategory}</span> sedang dalam tahap sinkronisasi data.
               </p>
            </div>
          </div>
          
        )}

      </div>
    </div>
  );
}