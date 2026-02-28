"use client";

import React from 'react';

// Import Component Modular
import RadarWidget from '@/components/layouts/RadarWidget';
import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import CompanyProfileWidget from '@/components/layouts/CompanyProfileWidget';
import StockStatsWidget from '@/components/layouts/StockStatsWidget';
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';

// REUSE: Langsung memanggil komponen Technical dari Folder Dashboard
import TechnicalAnalysisWidget from '@/components/dashboard/TechnicalAnalysisWidget';

export default function DefaultLayoutPage() {
  return (
    <div className="flex h-full w-full gap-1.5 p-1 bg-[#0a0a0a] text-[10px] tabular-nums overflow-hidden">
      
      {/* --- KOLOM 1: Radar & Technical Analysis --- */}
      <div className="w-[340px] flex flex-col gap-1.5 h-full shrink-0">
         <div className="flex-[1.2] overflow-hidden"><RadarWidget /></div>
         <div className="flex-[0.6] overflow-hidden"><TechnicalAnalysisWidget /></div>
      </div>

      {/* --- KOLOM 2: Advanced Chart & Volume Activity --- */}
      <div className="flex-1 flex flex-col gap-1.5 h-full min-w-[250px]">
         <div className="flex-[1.5] overflow-hidden"><AdvancedChartWidget /></div>
         <div className="flex-[0.5] overflow-hidden"><VolumeActivityWidget /></div>
      </div>

      {/* --- KOLOM 3: Broker Distribution & Company Profile --- */}
      <div className="w-[360px] flex flex-col gap-1.5 h-full shrink-0">
         <div className="flex-[1.2] overflow-hidden"><BrokerDistWidget /></div>
         <div className="flex-[0.8] overflow-hidden"><CompanyProfileWidget/></div>
      </div>

      {/* --- KOLOM 4: Price Stats & Broker Summary (CLEAN 2 KOMPONEN) --- */}
      <div className="w-[280px] flex flex-col gap-1.5 h-full shrink-0">
         {/* Porsi tinggi disesuaikan agar Stats dan Summary proporsional */}
         <div className="flex-[0.5] overflow-hidden"><StockStatsWidget /></div>
         <div className="flex-[1.2] overflow-hidden"><BrokerSummaryWidget /></div>
      </div>

    </div>
  );
}