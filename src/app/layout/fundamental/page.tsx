"use client";

import React, { useState } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';

// Import komponen kategori (Kita buat FundamentalTablePanel terlebih dahulu)
import FundamentalTablePanel from '@/components/fundamental/FundamentalTablePanel';

type FundamentalCategory = "Tabel" | "Grafik" | "Comparison";

export default function FundamentalPage() {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BUMI";
  const [activeCategory, setActiveCategory] = useState<FundamentalCategory>("Tabel");

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] rounded-lg overflow-hidden border border-[#2d2d2d] shadow-lg">
      
      {/* --- HEADER SUB-NAVIGATION (Tabel, Grafik, Comparison) --- */}
      <div className="p-3 border-b border-[#2d2d2d] bg-[#121212] flex items-center justify-between shrink-0">
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
        
        {/* Indikator Emiten Aktif */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 text-[10px] font-semibold uppercase tracking-widest">Active Symbol:</span>
          <span className="bg-[#1e1e1e] text-[#0ea5e9] px-2.5 py-1 rounded border border-[#2d2d2d] text-[11px] font-black">
            {globalSymbol}
          </span>
        </div>
      </div>

      {/* --- RENDER AREA KONTEN (Tergantung Tab yang Dipilih) --- */}
      <div className="flex-1 overflow-hidden relative bg-[#121212]">
        
        {activeCategory === "Tabel" && (
          <div className="w-full h-full animate-in fade-in duration-300">
             <FundamentalTablePanel symbol={globalSymbol} />
          </div>
        )}
        
        {activeCategory === "Grafik" && (
          <div className="w-full h-full p-4">
             <div className="w-full h-full border-2 border-dashed border-[#0ea5e9]/30 rounded-lg flex items-center justify-center text-neutral-500 text-xs font-bold">
               [ Area Render: Komponen Grafik (Dalam Pengembangan) ]
             </div>
          </div>
        )}
        
        {activeCategory === "Comparison" && (
          <div className="w-full h-full p-4">
             <div className="w-full h-full border-2 border-dashed border-[#10b981]/30 rounded-lg flex items-center justify-center text-neutral-500 text-xs font-bold">
               [ Area Render: Komponen Comparison (Dalam Pengembangan) ]
             </div>
          </div>
        )}

      </div>

    </div>
  );
}