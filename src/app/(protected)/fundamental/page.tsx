// src/app/(protected)/fundamental/page.tsx
"use client";

import React, { useState } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Search } from 'lucide-react';

// Import Panel Komponen
import FundamentalTablePanel from '@/components/fundamental/FundamentalTablePanel';
import FundamentalChartPanel from '@/components/fundamental/FundamentalChartPanel';
import FundamentalComparisonPanel from '@/components/fundamental/FundamentalComparisonPanel';

type FundamentalCategory = "Tabel" | "Grafik" | "Comparison";

export default function FundamentalStandalonePage() {
  const { activeSymbol: globalSymbol, setActiveSymbol } = useCompanyStore();
  const [activeCategory, setActiveCategory] = useState<FundamentalCategory>("Tabel");

  // Local state untuk Input Search
  const [searchQuery, setSearchQuery] = useState(globalSymbol || "BUMI");
  const [prevSymbol, setPrevSymbol] = useState(globalSymbol || "BUMI");

  // Sinkronisasi jika globalSymbol berubah dari luar (misal via Topbar/Watchlist)
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
    // Wrapper luar tanpa border tebal, flex column dengan gap
    <div className="p-2 h-[calc(100vh-42px)] w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER: Kategori & Search Bar (Clean & Flat) */}
      <div className="flex items-center justify-between shrink-0 px-1 mt-1">
        
        {/* TABS KATEGORI */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {(["Tabel", "Grafik", "Comparison"] as FundamentalCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] border-transparent"
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

      {/* RENDER AREA KONTEN (PANEL-PANEL) */}
      <div className="flex-1 overflow-hidden relative">
        
        {activeCategory === "Tabel" && (
          <div className="w-full h-full animate-in fade-in duration-300">
             <FundamentalTablePanel symbol={globalSymbol} />
          </div>
        )}
        
        {activeCategory === "Grafik" && (
          <div className="w-full h-full animate-in fade-in duration-300">
             <FundamentalChartPanel symbol={globalSymbol} />
          </div>
        )}
        
        {activeCategory === "Comparison" && (
          <div className="w-full h-full animate-in fade-in duration-300">
             <FundamentalComparisonPanel initialSymbol={globalSymbol} />
          </div>
        )}

      </div>

    </div>
  );
}