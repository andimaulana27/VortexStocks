// src/app/(protected)/technical/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Import Widgets
import AdvancedChartWidget from "@/components/layouts/AdvancedChartWidget";
import BrokerDistWidget from "@/components/layouts/BrokerDistWidget";
import TechnicalAnalysisWidget from "@/components/dashboard/TechnicalAnalysisWidget";
import BrokerSummaryWidget from "@/components/layouts/BrokerSummaryWidget";
import SymbolFinancialsWidget from "@/components/layouts/SymbolFinancialsWidget";
import CalculationStatusWidget from "@/components/layouts/CalculationStatusWidget";

const INDICATOR_MAPPING = [
  { id: 'ma_ema', label: 'Ma+Ema' }, { id: 'macd', label: 'Macd' }, { id: 'stoch_rsi', label: 'Stoch Rsi' },
  { id: 'rsi', label: 'RSI' }, { id: 'big_volume', label: 'Big Volume' }, { id: 'breakout_ch', label: 'Breakout Ch' },
  { id: 'trendline_atr', label: 'Trendline ATR' }, { id: 'dtfx_zone', label: 'DTFX Zone' }, { id: 'zig_zag', label: 'Zig-Zag Ch' },
  { id: 'money_flow', label: 'Money Flow' }, { id: 'atr_supertrend', label: 'ATR SuperTrend' }, { id: 'reversal', label: 'Reversal' },
  { id: 'trending_market', label: 'Trending Market' }, { id: 'swing_hl', label: 'Swing H/L' }, { id: 'rsi_multi', label: 'RSI Multi Lenght' },
  { id: 'buy_sell', label: 'Buy Sell' }, { id: 'swing_flow', label: 'Swing Flow' }, { id: 'cs_confirm', label: 'CS Confirm' },
  { id: 'aura', label: 'AURA' }, { id: 'super_trend', label: 'Super Trend' }
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
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(""); 
  const [activeTimeframe, setActiveTimeframe] = useState("1D");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase.from('profiles').select('technical_settings').eq('id', user.id).single();
        
        if (!error && data?.technical_settings) {
          const settings = data.technical_settings as Record<string, boolean>;
          const activeLabels = INDICATOR_MAPPING
            .filter(ind => settings[ind.id] === true)
            .map(ind => ind.label);

          // PERBAIKAN LOGIKA: Jika array kosong (user menonaktifkan semua), jangan paksa default.
          setActiveCategories(activeLabels);
          if (activeLabels.length > 0) setActiveCategory(activeLabels[0]);
        } else {
          // Hanya gunakan default jika di database belum ada setting sama sekali
          const defaultCategories = ["Ma+Ema", "Macd", "Stoch Rsi", "RSI"];
          setActiveCategories(defaultCategories);
          setActiveCategory(defaultCategories[0]);
        }
      }
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full bg-[#121212] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const halfLength = Math.ceil(activeCategories.length / 2);
  const row1Categories = activeCategories.slice(0, halfLength);
  const row2Categories = activeCategories.slice(halfLength);

  return (
    <div className="p-2 h-[calc(100vh-42px)] w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER: Kategori Logic & Timeframes */}
      <div className="flex items-center gap-4 shrink-0 px-1 mt-1 overflow-x-auto hide-scrollbar pb-1 min-h-[48px]">
        
        {/* Jika tidak ada indikator yang aktif, tampilkan peringatan elegan */}
        {activeCategories.length === 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#ef4444] font-bold border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
              0 Indikator Aktif
            </span>
            <Link href="/settings" className="text-[11px] text-[#10b981] hover:text-white transition-colors underline underline-offset-2">
              Buka Settings
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 w-max">
              {row1Categories.map((cat, index) => {
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
            {row2Categories.length > 0 && (
              <div className="flex gap-2 w-max">
                {row2Categories.map((cat, index) => {
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
            )}
          </div>
        )}

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

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden mt-1">
        
        <div className="col-span-5 overflow-hidden flex flex-col">
          <CalculationStatusWidget activeCategory={activeCategory || "No Data"} />
        </div>

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

        <div className="col-span-2 overflow-hidden flex flex-col">
          <BrokerSummaryWidget />
        </div>

      </div>
    </div>
  );
}