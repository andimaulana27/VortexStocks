"use client";

import React, { useState } from 'react';

// Import komponen tab yang nanti akan kita buat file terpisahnya
import TradingViewScreener from '@/components/screener/TradingViewScreener';
import PresetScreener from '@/components/screener/PresetScreener';
import MyScreener from '@/components/screener/MyScreener';
import CreateScreener from '@/components/screener/CreateScreener';

// ==========================================
// KATEGORI TAB SCREENER
// ==========================================
const SCREENER_TABS = [
  "TV Screener",
  "Preset Screener",
  "My Screener",
  "Create New"
];

// ==========================================
// HALAMAN UTAMA SCREENER (WADAH)
// ==========================================
export default function ScreenerPage() {
  const [activeTab, setActiveTab] = useState(SCREENER_TABS[0]);

  return (
    <div className="p-2 h-[calc(100vh-42px)] w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER TABS */}
      <div className="flex items-center justify-between shrink-0 px-1 mt-1">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full">
          {SCREENER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 whitespace-nowrap ${
                activeTab === tab
                  ? "bg-gradient-to-r from-[#10b981] to-[#0ea5e9] text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] border-transparent"
                  : "bg-[#121212] border border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative mt-1">
        {activeTab === "TV Screener" && <TradingViewScreener />}
        {activeTab === "Preset Screener" && <PresetScreener />}
        {activeTab === "My Screener" && <MyScreener />}
        {activeTab === "Create New" && <CreateScreener />}
      </div>

    </div>
  );
}