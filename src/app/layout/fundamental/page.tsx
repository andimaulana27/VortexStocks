"use client";

import React, { useState } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Search } from 'lucide-react';

import FundamentalTablePanel from '@/components/fundamental/FundamentalTablePanel';
import FundamentalChartPanel from '@/components/fundamental/FundamentalChartPanel';
import FundamentalComparisonPanel from '@/components/fundamental/FundamentalComparisonPanel';

type FundamentalCategory = "Tabel" | "Grafik" | "Comparison";

export default function FundamentalPage() {
  const { activeSymbol: globalSymbol, setActiveSymbol } = useCompanyStore();
  const [activeCategory, setActiveCategory] = useState<FundamentalCategory>("Tabel");

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
    <div className="flex flex-col h-full w-full bg-[#121212] rounded-lg overflow-hidden border border-[#2d2d2d] shadow-lg">
      
      {/* HEADER SUB-NAVIGATION & SEARCH BAR */}
      <div className="p-3 border-b border-[#2d2d2d] bg-[#121212] flex items-center justify-between shrink-0">
        
        {/* TABS KATEGORI */}
        <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-full border border-[#2d2d2d]">
          {(["Tabel", "Grafik", "Comparison"] as FundamentalCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                  : "text-neutral-500 hover:text-white hover:bg-[#1e1e1e]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* SEARCH BAR (Hanya untuk Active Symbol Utama) */}
        <div className="flex items-center gap-3">
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
              className="bg-[#1e1e1e] text-[#f59e0b] text-[11px] font-black uppercase tracking-widest pl-8 pr-3 py-1.5 rounded border border-[#2d2d2d] focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all w-32 md:w-40 placeholder:text-neutral-600 placeholder:font-semibold"
            />
            <button type="submit" className="hidden">Search</button>
          </form>
        </div>
      </div>

      {/* RENDER AREA KONTEN */}
      <div className="flex-1 overflow-hidden relative bg-[#121212]">
        
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
        
        {/* TAB COMPARISON DI-RENDER DI SINI */}
        {activeCategory === "Comparison" && (
          <div className="w-full h-full animate-in fade-in duration-300">
             <FundamentalComparisonPanel initialSymbol={globalSymbol} />
          </div>
        )}

      </div>

    </div>
  );
}