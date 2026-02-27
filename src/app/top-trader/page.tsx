// src/app/top-trader/page.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Calendar, Trophy } from 'lucide-react';

// --- MOCK DATA: Simulasi Top Trader ---
// Nantinya data ini akan ditarik dari Supabase (Tabel Journal/Portofolio)
const TOP_TRADERS = Array.from({ length: 10 }).map((_, i) => ({
  id: `trader_${i}`,
  rank: i + 1,
  name: i % 2 === 0 ? 'Marlina Smith' : 'Alexandar Wijaya',
  avatar: `https://i.pravatar.cc/150?img=${i + 10}`,
  modal: 100000000,
  profit: 50000000,
  loss: 20000000,
  grow: 130000000,
  // SVG Path acak untuk simulasi grafik naik-turun
  chartData: i % 2 === 0 
    ? "M0,50 Q10,40 20,45 T40,30 T60,35 T80,10 T100,20 V100 H0 Z" 
    : "M0,60 Q10,50 20,55 T40,40 T60,45 T80,15 T100,5 V100 H0 Z"
}));

export default function TopTraderPage() {
  // Hanya mengambil dateRange karena setDateRange belum digunakan untuk filter interaktif
  const [dateRange] = useState("Feb 13, 2026 - Feb 13, 2026");

  // Format angka ke Rupiah ringkas
  const formatIDR = (num: number) => {
    return num.toLocaleString('id-ID');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden p-4 md:p-6 relative">
      
      {/* Ornamen Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#10b981]/5 to-transparent blur-[100px] pointer-events-none"></div>

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-[#f59e0b]" size={28} /> Top Trader Leaderboard
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Pantau performa dan pertumbuhan portofolio dari Whale & Elite Trader.</p>
        </div>

        {/* Date Picker Button */}
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] rounded-lg text-sm font-bold text-neutral-300 transition-colors shadow-sm">
          <Calendar size={16} className="text-neutral-500" />
          {dateRange}
        </button>
      </div>

      {/* --- LEADERBOARD GRID --- */}
      {/* Menggunakan grid 1 kolom di HP, 2 kolom di layar besar, persis seperti referensi */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10 pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          
          {TOP_TRADERS.map((trader) => (
            <div 
              key={trader.id} 
              className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-5 flex items-center gap-6 hover:bg-[#1e1e1e] hover:border-[#3f3f46] transition-all group shadow-md"
            >
              
              {/* 1. Area Avatar & Nama */}
              <div className="flex flex-col items-center justify-center shrink-0 relative w-20">
                <div className="relative">
                  {/* Migrasi dari <img> ke <Image /> dengan membungkus border dinamis pada parent div */}
                  <div className={`relative w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg ${trader.rank === 1 ? 'border-[#f59e0b]' : trader.rank === 2 ? 'border-[#94a3b8]' : trader.rank === 3 ? 'border-[#b45309]' : 'border-[#2d2d2d]'}`}>
                    <Image 
                      src={trader.avatar} 
                      alt={trader.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  {/* Badge Rank */}
                  <div className={`absolute -bottom-2 -right-2 w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-black border-2 border-[#121212] shadow-sm
                    ${trader.rank === 1 ? 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-black' : 
                      trader.rank === 2 ? 'bg-gradient-to-r from-[#94a3b8] to-[#cbd5e1] text-black' : 
                      trader.rank === 3 ? 'bg-gradient-to-r from-[#b45309] to-[#d97706] text-white' : 
                      'bg-[#2d2d2d] text-white'}`}
                  >
                    #{trader.rank}
                  </div>
                </div>
                <p className="text-white text-[11px] font-bold mt-3 text-center leading-tight">
                  {trader.name.split(' ').map((n, i) => <span key={i} className="block">{n}</span>)}
                </p>
              </div>

              {/* 2. Area Metrik (Modal, Profit, Loss, Grow) */}
              <div className="flex flex-col gap-1.5 shrink-0 tabular-nums">
                <div className="flex items-center text-[12px]">
                  <span className="w-14 text-neutral-400 font-medium">Modal</span>
                  <span className="text-neutral-600 mx-2">:</span>
                  <span className="text-white font-bold">{formatIDR(trader.modal)}</span>
                </div>
                <div className="flex items-center text-[12px]">
                  <span className="w-14 text-neutral-400 font-medium">Profit</span>
                  <span className="text-neutral-600 mx-2">:</span>
                  <span className="text-[#10b981] font-bold">{formatIDR(trader.profit)}</span>
                </div>
                <div className="flex items-center text-[12px]">
                  <span className="w-14 text-neutral-400 font-medium">Loss</span>
                  <span className="text-neutral-600 mx-2">:</span>
                  <span className="text-[#ef4444] font-bold">{formatIDR(trader.loss)}</span>
                </div>
                <div className="flex items-center text-[12px]">
                  <span className="w-14 text-neutral-400 font-medium">Grow</span>
                  <span className="text-neutral-600 mx-2">:</span>
                  <span className="text-[#06b6d4] font-bold">{formatIDR(trader.grow)}</span>
                </div>
              </div>

              {/* 3. Area Mini Chart (Sparkline) */}
              <div className="flex-1 h-20 ml-auto max-w-[180px] relative flex items-end opacity-80 group-hover:opacity-100 transition-opacity">
                {/* Simulasi Grid Lines Background */}
                <div className="absolute inset-0 flex flex-col justify-between border-l border-b border-[#2d2d2d] pb-1 pl-1">
                   <div className="w-full h-[1px] bg-[#2d2d2d]/50"></div>
                   <div className="w-full h-[1px] bg-[#2d2d2d]/50"></div>
                   <div className="w-full h-[1px] bg-[#2d2d2d]/50"></div>
                </div>
                
                {/* SVG Area Chart */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]">
                  <defs>
                    <linearGradient id={`grad_${trader.id}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={trader.chartData} fill={`url(#grad_${trader.id})`} stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

            </div>
          ))}

        </div>
      </div>
      
    </div>
  );
}