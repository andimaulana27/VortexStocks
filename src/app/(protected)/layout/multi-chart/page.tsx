"use client";

import React, { useState } from 'react';
import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget';
import { Search } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// Komponen Pembungkus Chart Individual dengan Local State
const IndependentChartBlock = ({ initialSymbol }: { initialSymbol: string }) => {
  const [localSymbol, setLocalSymbol] = useState(initialSymbol);
  const [searchQ, setSearchQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const allCompanies = useCompanyStore(state => state.companies);

  const searchResults = Object.values(allCompanies)
    .filter(c => c.symbol.includes(searchQ.toUpperCase()))
    .slice(0, 5);

  const handleSelect = (sym: string) => {
    setLocalSymbol(sym);
    setIsSearching(false);
    setSearchQ("");
  };

  return (
    <div className="flex flex-col h-full w-full border border-[#2d2d2d] rounded-lg overflow-hidden bg-[#121212] relative">
      {/* Local Toolbar */}
      <div className="absolute top-2 left-2 z-30 flex items-center gap-2">
        {isSearching ? (
          <div className="relative">
            <div className="flex items-center bg-[#1e1e1e] border border-[#f59e0b] rounded px-2 py-1 shadow-lg">
              <Search size={12} className="text-[#f59e0b] mr-1.5" />
              <input 
                autoFocus
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQ.trim()) handleSelect(searchQ.toUpperCase()); }}
                className="bg-transparent w-20 outline-none text-white font-bold uppercase text-[11px]"
                placeholder="SYMBOL..."
              />
            </div>
            {searchQ && (
              <div className="absolute top-full left-0 mt-1 bg-[#1e1e1e] border border-[#2d2d2d] rounded shadow-xl min-w-[120px]">
                {searchResults.map(c => (
                  <div 
                    key={c.symbol} 
                    onMouseDown={(e) => {
                      // Prevent onBlur dari input mentrigger lebih dulu dari onClick
                      e.preventDefault(); 
                      handleSelect(c.symbol);
                    }} 
                    className="px-3 py-2 hover:bg-[#2d2d2d] cursor-pointer text-white font-bold text-[10px]"
                  >
                    {c.symbol}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => setIsSearching(true)}
            className="bg-[#1e1e1e]/90 backdrop-blur px-3 py-1.5 rounded border border-[#2d2d2d] text-white font-black text-[12px] hover:border-[#f59e0b] hover:text-[#f59e0b] transition-colors shadow-md"
          >
            {localSymbol} <span className="text-neutral-500 font-normal text-[10px] ml-1">▾ Change</span>
          </button>
        )}
      </div>

      <div className="flex-1 w-full relative min-h-0 pt-10">
         <div className="absolute inset-0">
            {/* Karena AdvancedChartWidget sudah diperbarui, ia kini valid menerima prop customSymbol */}
            <AdvancedChartWidget key={localSymbol} customSymbol={localSymbol} />
         </div>
      </div>
    </div>
  );
};

export default function MultiChartPage() {
  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden gap-1.5 p-1">
      {/* GRID 2x2 UNTUK 4 CHART BERSAMAAN */}
      <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full w-full">
         <IndependentChartBlock initialSymbol="IHSG" />
         <IndependentChartBlock initialSymbol="BBCA" />
         <IndependentChartBlock initialSymbol="BMRI" />
         <IndependentChartBlock initialSymbol="BBRI" />
      </div>
    </div>
  );
}