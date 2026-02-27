"use client";

import React from 'react';
// Import komponen Smart Money Order Book yang baru dibuat
import SmartMoneyOrderBookWidget from '@/components/layouts/SmartMoneyOrderBookWidget';

// 10 Saham Default yang aktif di Market (Bisa diganti manual lewat search per widget)
const DEFAULT_SYMBOLS = [
  "BBCA", "BBRI", "BMRI", "BBNI", "BREN",
  "AMMN", "TLKM", "ASII", "GOTO", "BUMI"
];

export default function SmartMoneyPage() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0a0a0a]">
      
      {/* GRID CONTAINER - Sangat Padat */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 p-1 overflow-y-auto custom-scrollbar">
        
        {DEFAULT_SYMBOLS.map((sym, index) => (
          // Membatasi tinggi agar terlihat seragam seperti di terminal trading asli
          <div key={`${sym}-${index}`} className="h-[450px]">
            <SmartMoneyOrderBookWidget initialSymbol={sym} />
          </div>
        ))}
        
      </div>
      
    </div>
  );
}