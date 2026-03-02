// src/app/(protected)/smart-money/page.tsx
"use client";

import React, { useState } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Search } from 'lucide-react';

// Import Widgets
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import RadarWidget from '@/components/layouts/RadarWidget';
import BrokerActivityWidget from '@/components/layouts/BrokerActivityWidget'; 
import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget'; 
import TechnicalAnalysisWidget from '@/components/dashboard/TechnicalAnalysisWidget'; 

// Kategori Smart Money
const SMART_MONEY_CATEGORIES = [
  "Broksum", 
  "Insider", 
  "Foreign", 
  "Volume", 
  "Smart Money",
  "Anomali Broker",
  "Top Acum",
  "Shareholders"
];

export default function SmartMoneyStandalonePage() {
  const { activeSymbol: globalSymbol, setActiveSymbol } = useCompanyStore();
  const [activeCategory, setActiveCategory] = useState(SMART_MONEY_CATEGORIES[0]); // Default: Broksum

  const [searchQuery, setSearchQuery] = useState(globalSymbol || "BUMI");
  const [prevSymbol, setPrevSymbol] = useState(globalSymbol || "BUMI");

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
        
        {/* VIEW KHUSUS "BROKSUM" (Layout Gabungan Kolom Kanan) */}
        {activeCategory === "Broksum" ? (
          <div className="flex gap-2 h-full min-w-[1300px]"> 
            
            {/* KOLOM 1: Broker Activity */}
            <div className="w-[480px] shrink-0 h-full overflow-hidden">
               <BrokerActivityWidget />
            </div>

            {/* KOLOM 2: Broker Summary */}
            <div className="w-[350px] shrink-0 h-full overflow-hidden">
               <BrokerSummaryWidget />
            </div>

            {/* KOLOM 3: Broker Dist (Atas) & Technical Analysis (Bawah) 
                -> DIPERLEBAR ke 340px agar konten Data Bandar & Gauge Chart lebih lega */}
            <div className="w-[400px] shrink-0 h-full flex flex-col gap-2 overflow-hidden">
               <div className="flex-[0.6] overflow-hidden">
                  <BrokerDistWidget />
               </div>
               <div className="flex-[0.4] overflow-hidden">
                  <TechnicalAnalysisWidget />
               </div>
            </div>

            {/* KOLOM GABUNGAN (4 & 5): Advanced Chart & Volume Activity 
                -> Menggunakan flex-1 sehingga otomatis menyusut menyeimbangkan Kolom 3 */}
            <div className="flex-1 min-w-[350px] h-full flex flex-col gap-2 overflow-hidden">
               
               {/* ATAS: Advanced Chart (Lebih dominan, 70% tinggi) */}
               <div className="flex-[0.7] w-full overflow-hidden rounded-xl">
                  <AdvancedChartWidget />
               </div>
               
               {/* BAWAH: Volume Activity (Menyebar lebar, 30% tinggi) */}
               <div className="flex-[0.3] w-full overflow-hidden rounded-xl">
                  <VolumeActivityWidget />
               </div>

            </div>

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