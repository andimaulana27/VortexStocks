// src/app/(protected)/combination/page.tsx
'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import TechnicalAnalysisWidget from '@/components/dashboard/TechnicalAnalysisWidget';

// --- DATA MOCKUP INDIKATOR TEKNIKAL (Persis seperti di gambar) ---
const TECHNICAL_INDICATORS = [
  // Baris 1
  { name: 'Ma+Ema', status: 'Buy' },
  { name: 'Macd', status: 'Wait' },
  { name: 'Stoch Rsi', status: 'Buy' },
  { name: 'RSI', status: 'Buy' },
  { name: 'Big Volume', status: 'Sell' },
  { name: 'Breakout Ch', status: 'Buy' },
  { name: 'Trendline ATR', status: 'Buy' },
  { name: 'DTFX Zone', status: 'Buy' },
  { name: 'Zig-Zag Ch', status: 'Buy' },
  { name: 'Money Flow', status: 'Sell' },
  // Baris 2
  { name: 'ATR SuperTrend', status: 'Sell' },
  { name: 'Reversal', status: 'Buy' },
  { name: 'Trending Market', status: 'Sell' },
  { name: 'Swing H/L', status: 'Buy' },
  { name: 'RSI Multi Lenght', status: 'Wait' },
  { name: 'Buy Sell', status: 'Buy' },
  { name: 'Swing Flow', status: 'Wait' },
  { name: 'CS Confirm', status: 'Sell' },
  { name: 'AURA', status: 'Buy' },
  { name: 'Super Trend', status: 'Buy' },
];

export default function CombinationPage() {
  
  // Fungsi Helper untuk menentukan warna berdasarkan status
  const getColorClasses = (status: string) => {
    switch(status) {
      case 'Buy': return { border: 'border-[#10b981]', bg: 'bg-[#10b981]' };
      case 'Sell': return { border: 'border-[#ef4444]', bg: 'bg-[#ef4444]' };
      case 'Wait': return { border: 'border-[#f97316]', bg: 'bg-[#f97316]' };
      default: return { border: 'border-neutral-500', bg: 'bg-neutral-500' };
    }
  };

  // Kalkulasi total status
  const totalBuy = TECHNICAL_INDICATORS.filter(i => i.status === 'Buy').length;
  const totalSell = TECHNICAL_INDICATORS.filter(i => i.status === 'Sell').length;
  const totalWait = TECHNICAL_INDICATORS.filter(i => i.status === 'Wait').length;

  return (
    // PERUBAHAN UTAMA: bg-[#0a0a0a] diubah menjadi bg-[#121212] agar menyatu dan clean
    <div className="flex flex-col w-full h-full bg-[#121212] p-4 overflow-y-auto custom-scrollbar gap-4">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center shrink-0">
        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] rounded text-xs font-bold text-neutral-300 transition-colors">
          <Calendar size={14} className="text-neutral-500" /> Feb 13, 2026 - Feb 13, 2026
        </button>
      </div>

      {/* --- BARIS 1: 3 KOLOM WIDGET --- */}
      {/* Menggunakan lg:h-[70vh] agar proporsional di layar besar, namun bisa di-scroll di layar kecil */}
      <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[72vh] min-h-[700px] shrink-0">
        
        {/* KOLOM 1: Advanced Chart & Volume Activity (Lebar ~55%) */}
        <div className="flex flex-col flex-[2.0] gap-4 h-full">
          <div className="flex-1 min-h-0">
            <AdvancedChartWidget />
          </div>
          <div className="h-[220px] shrink-0">
            <VolumeActivityWidget />
          </div>
        </div>

        {/* KOLOM 2: Broker Summary (Lebar ~20%, Tinggi Penuh Sejajar Kolom 1) */}
        <div className="flex-[1.1] h-full min-h-[600px] lg:min-h-0">
          <BrokerSummaryWidget />
        </div>

        {/* KOLOM 3: Broker Dist & Tech Analysis (Lebar ~25%) */}
        <div className="flex flex-col flex-[1.1] gap-4 h-full min-h-[600px] lg:min-h-0">
          <div className="flex-1 min-h-0">
            <BrokerDistWidget />
          </div>
          <div className="h-[370px] shrink-0">
            <TechnicalAnalysisWidget />
          </div>
        </div>

      </div>

      {/* --- BARIS 2: TEKNIKAL LOGIC & SUMMARY --- */}
      <div className="flex flex-col lg:flex-row gap-6 shrink-0 pt-4 pb-10">
        
        {/* Kiri: Grid 10 Kolom Indikator Teknikal */}
        <div className="flex-1 grid grid-cols-5 md:grid-cols-10 gap-x-2 gap-y-4">
          {TECHNICAL_INDICATORS.map((indicator, idx) => {
            const colors = getColorClasses(indicator.status);
            return (
              <div key={idx} className="flex flex-col gap-1.5">
                {/* Pill Nama Indikator (Background Hitam, Border Warna) */}
                <div className={`border ${colors.border} rounded-full py-1.5 px-1 flex items-center justify-center text-center bg-transparent`}>
                  <span className="text-white text-[9px] font-bold truncate tracking-wide">
                    {indicator.name}
                  </span>
                </div>
                {/* Pill Status (Background Solid Warna) */}
                <div className={`${colors.bg} rounded-full py-1.5 px-1 flex items-center justify-center text-center shadow-md`}>
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">
                    {indicator.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kanan: Summary Total Indikator */}
        <div className="w-full lg:w-[220px] shrink-0 flex flex-col justify-center gap-3 lg:pl-6 lg:border-l border-[#2d2d2d]">
          <div className="bg-[#10b981] rounded-full py-2.5 px-4 text-center shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
            <span className="text-white text-sm font-bold">{totalBuy} Indicator BUY</span>
          </div>
          <div className="bg-[#ef4444] rounded-full py-2.5 px-4 text-center shadow-[0_4px_12px_rgba(239,68,68,0.3)]">
            <span className="text-white text-sm font-bold">{totalSell} Indicator SELL</span>
          </div>
          <div className="bg-[#f97316] rounded-full py-2.5 px-4 text-center shadow-[0_4px_12px_rgba(249,115,22,0.3)]">
            <span className="text-white text-sm font-bold">{totalWait} Indicator WAIT</span>
          </div>
        </div>

      </div>

    </div>
  );
}