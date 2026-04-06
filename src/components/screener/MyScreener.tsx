"use client";

import React, { useState } from 'react';
import { Bookmark, Search, MoreVertical, Play, Plus, Clock } from 'lucide-react';

// Dummy data sementara sebelum dihubungkan ke Supabase Database
const SAVED_SCREENERS = [
  { id: 1, name: "Swing Trading Cuan", desc: "MACD Golden Cross + Volume naik > 20% dari rata-rata 20 hari.", updatedAt: "2 Hari yang lalu", count: 12 },
  { id: 2, name: "Bluechip Deviden", desc: "Saham LQ45 dengan Deviden Yield > 5% dan ROE > 15%.", updatedAt: "1 Minggu yang lalu", count: 4 },
];

const MyScreener = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredScreeners = SAVED_SCREENERS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col w-full h-full shadow-lg p-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Bookmark size={20} className="text-[#0ea5e9]" />
            Screener Tersimpan
          </h2>
          <p className="text-neutral-500 text-[13px] mt-1">Kelola dan jalankan kembali screener hasil racikan Anda sendiri.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Cari screener saya..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-[12px] bg-[#1e1e1e] border border-[#2d2d2d] rounded-full text-white placeholder-neutral-500 focus:outline-none focus:border-[#0ea5e9] transition-colors w-[250px]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white text-[12px] font-bold rounded-full shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all">
            <Plus size={16} /> Buat Baru
          </button>
        </div>
      </div>

      {/* List / Grid Section */}
      {filteredScreeners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-tv-scroll pb-4">
          {filteredScreeners.map((item) => (
            <div key={item.id} className="bg-[#1e1e1e]/60 border border-[#2d2d2d] rounded-2xl p-5 hover:border-[#0ea5e9]/50 transition-all duration-300 group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-bold text-[15px] group-hover:text-[#0ea5e9] transition-colors">{item.name}</h3>
                <button className="text-neutral-500 hover:text-white p-1 rounded-md hover:bg-[#2d2d2d] transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
              <p className="text-neutral-400 text-[12px] line-clamp-2 mb-4 flex-1">
                {item.desc}
              </p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#2d2d2d]">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-medium">
                  <Clock size={12} />
                  {item.updatedAt}
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 hover:bg-[#10b981] hover:text-white text-[11px] font-bold rounded-lg transition-colors">
                  <Play size={12} /> Jalankan
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center border border-[#2d2d2d] border-dashed rounded-xl bg-[#1e1e1e]/20">
          <Bookmark size={40} className="text-[#3f3f46] mb-4" />
          <h3 className="text-white font-bold text-[15px] mb-1">Belum ada Screener</h3>
          <p className="text-neutral-500 text-[12px] max-w-sm">Anda belum menyimpan strategi screener apapun. Klik &quot;Buat Baru&quot; untuk mulai meracik formula Anda.</p>
        </div>
      )}
    </div>
  );
};

export default MyScreener;