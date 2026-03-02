// src/app/(protected)/technical/page.tsx
"use client";

import React, { useState } from 'react';

// Import Widgets
import AdvancedChartWidget from "@/components/layouts/AdvancedChartWidget";
import BrokerDistWidget from "@/components/layouts/BrokerDistWidget";
import TechnicalAnalysisWidget from "@/components/dashboard/TechnicalAnalysisWidget";
import BrokerSummaryWidget from "@/components/layouts/BrokerSummaryWidget";
import SymbolFinancialsWidget from "@/components/layouts/SymbolFinancialsWidget";
import CalculationStatusWidget from "@/components/layouts/CalculationStatusWidget";

const TECHNICAL_CATEGORIES = [
  // Baris 1 (1-10)
  "Ma+Ema", "Macd", "Stoch Rsi", "RSI", "Big Volume", 
  "Breakout Ch", "Trendline ATR", "DTFX Zone", "Zig-Zag Ch", "Money Flow",
  // Baris 2 (11-20)
  "ATR SuperTrend", "Reversal", "Trending Market", "Swing H/L", "RSI Multi Lenght",
  "Buy Sell", "Swing Flow", "CS Confirm", "AURA", "Super Trend"
];

const PREMIUM_GRADIENTS = [
  "bg-gradient-to-r from-[#10b981] to-[#0ea5e9] shadow-[0_0_12px_rgba(16,185,129,0.3)] border-transparent text-white",
  "bg-gradient-to-r from-[#f43f5e] to-[#f97316] shadow-[0_0_12px_rgba(244,63,94,0.3)] border-transparent text-white",
  "bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] shadow-[0_0_12px_rgba(139,92,246,0.3)] border-transparent text-white",
  "bg-gradient-to-r from-[#3b82f6] to-[#2dd4bf] shadow-[0_0_12px_rgba(59,130,246,0.3)] border-transparent text-white",
  "bg-gradient-to-r from-[#f59e0b] to-[#ef4444] shadow-[0_0_12px_rgba(245,158,11,0.3)] border-transparent text-white",
  "bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] shadow-[0_0_12px_rgba(6,182,212,0.3)] border-transparent text-white",
  "bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] shadow-[0_0_12px_rgba(236,72,153,0.3)] border-transparent text-white",
  "bg-gradient-to-r from-[#14b8a6] to-[#10b981] shadow-[0_0_12px_rgba(20,184,166,0.3)] border-transparent text-white",
];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W", "1M"];

export default function TechnicalPage() {
  const [activeCategory, setActiveCategory] = useState(TECHNICAL_CATEGORIES[10]); // Default: ATR SuperTrend
  const [activeTimeframe, setActiveTimeframe] = useState("1D");

  return (
    // Wrapper utama tanpa border tebal
    <div className="p-2 h-[calc(100vh-42px)] w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER: Kategori Logic (2 Baris) & Timeframes -> Sejajar horizontal super clean */}
      <div className="flex items-center gap-4 shrink-0 px-1 mt-1 overflow-x-auto hide-scrollbar pb-1">
        
        {/* KELOMPOK LOGIC (2 Baris Vertikal) */}
        <div className="flex flex-col gap-2">
          {/* Baris Atas */}
          <div className="flex gap-2 w-max">
            {TECHNICAL_CATEGORIES.slice(0, 10).map((cat, index) => {
              const isActive = activeCategory === cat;
              const activeStyle = PREMIUM_GRADIENTS[index % PREMIUM_GRADIENTS.length];
              const inactiveStyle = "bg-[#121212] text-neutral-500 border border-[#2d2d2d] hover:text-white hover:border-[#3e3e3e]";

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-300 ${isActive ? activeStyle : inactiveStyle}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          {/* Baris Bawah */}
          <div className="flex gap-2 w-max">
            {TECHNICAL_CATEGORIES.slice(10, 20).map((cat, index) => {
              const isActive = activeCategory === cat;
              const activeStyle = PREMIUM_GRADIENTS[(index + 3) % PREMIUM_GRADIENTS.length];
              const inactiveStyle = "bg-[#121212] text-neutral-500 border border-[#2d2d2d] hover:text-white hover:border-[#3e3e3e]";

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-300 ${isActive ? activeStyle : inactiveStyle}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* DIVIDER VERTIKAL */}
        <div className="w-px h-10 bg-[#2d2d2d] shrink-0 hidden md:block rounded-full"></div>

        {/* KELOMPOK TIMEFRAME */}
        <div className="flex items-center gap-2 w-max">
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

      {/* MAIN CONTENT GRID (Widget murni tanpa double border) */}
      <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden mt-1">
        
        {/* KOLOM 1 (Span 5): Status Perhitungan */}
        <div className="col-span-5 overflow-hidden flex flex-col">
          <CalculationStatusWidget activeCategory={activeCategory} />
        </div>

        {/* KOLOM 2 (Span 5): Advanced Chart + 3 Widget Bawah */}
        <div className="col-span-5 flex flex-col gap-2 overflow-hidden">
          <div className="flex-[0.6] overflow-hidden">
            <AdvancedChartWidget />
          </div>
          <div className="flex-[0.4] grid grid-cols-3 gap-2 overflow-hidden">
            <div className="overflow-hidden"><BrokerDistWidget /></div>
            <div className="overflow-hidden"><SymbolFinancialsWidget /></div>
            <div className="overflow-hidden"><TechnicalAnalysisWidget /></div>
          </div>
        </div>

        {/* KOLOM 3 (Span 2): Broker Summary */}
        <div className="col-span-2 overflow-hidden flex flex-col">
          <BrokerSummaryWidget />
        </div>

      </div>
    </div>
  );
}