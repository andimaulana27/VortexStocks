// src/app/(protected)/smart-money/page.tsx
"use client";

import React, { useState } from 'react';
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
import TopBrokerTable from '@/components/dashboard/TopBrokerTable'; 
import VolumeScreenerWidget from '@/components/layouts/VolumeScreenerWidget'; 
import SmartMoneyScreenerWidget from '@/components/layouts/SmartMoneyScreenerWidget'; 
import AnomaliBrokerWidget from '@/components/layouts/AnomaliBrokerWidget';
import TopAcumWidget from '@/components/layouts/TopAcumWidget';
// IMPORT BARU: Menambahkan komponen ShareholdersWidget
import ShareholdersWidget from '@/components/layouts/ShareholdersWidget'; 

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

// Daftar Broker Asing (Fixed List standard BEI)
const FOREIGN_BROKERS = [
  "AK", "YU", "YP", "ZP", "BK", "KZ", "CP", "KK", 
  "DR", "BQ", "TP", "XA", "HD", "AI", "RX"
];

export default function SmartMoneyStandalonePage() {
  useCompanyStore();
  const [activeCategory, setActiveCategory] = useState(SMART_MONEY_CATEGORIES[0]); 

  // State untuk Tab Foreign 
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>(["AK", "YU", "ZP", "BK"]); 
  const [dateRange] = useState("Feb 13, 2026 - Feb 13, 2026");

  const toggleBroker = (code: string) => {
    setSelectedBrokers(prev => 
      prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]
    );
  };

  return (
    <div className="p-2 h-[calc(100vh-42px)] w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER: Kategori */}
      <div className="flex items-center justify-between shrink-0 px-1 mt-1">
        
        {/* TABS KATEGORI */}
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
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar mt-1">
        
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
          <div className="h-full w-full">
             <VolumeScreenerWidget />
          </div>

        ) : activeCategory === "Smart Money" ? (
          <div className="h-full w-full">
             <SmartMoneyScreenerWidget />
          </div>

        ) : activeCategory === "Anomali Broker" ? (
          <div className="h-full w-full">
             <AnomaliBrokerWidget />
          </div>

        ) : activeCategory === "Top Acum" ? (
          <div className="h-full w-full">
             <TopAcumWidget />
          </div>

        ) : activeCategory === "Shareholders" ? (
          // RENDER BARU: Menampilkan widget yang baru dibuat saat tab Shareholders aktif
          <div className="h-full w-full">
             <ShareholdersWidget />
          </div>

        ) : (
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