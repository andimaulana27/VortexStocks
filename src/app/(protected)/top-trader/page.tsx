// src/app/(protected)/top-trader/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, Trophy, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// Tipe data berdasarkan respons Supabase dari join tabel screening_applications & profiles
interface WhaleData {
  estimated_balance: number;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export default function TopTraderPage() {
  const [dateRange] = useState("Hari Ini");
  const [traders, setTraders] = useState<WhaleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchTopWhales = async () => {
      try {
        // Menarik data REAL dari Supabase: 
        // Mencari portofolio yang sudah 'approved', diurutkan dari saldo terbesar
        const { data, error } = await supabase
          .from('screening_applications')
          .select(`
            estimated_balance,
            profiles (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('status', 'approved')
          .order('estimated_balance', { ascending: false })
          .limit(20); // Ambil Top 20

        if (error) throw error;
        
        if (data) {
          setTraders(data as unknown as WhaleData[]);
        }
      } catch (error) {
        console.error("Gagal menarik data Top Trader:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopWhales();
  }, [supabase]);

  // Format angka ke Rupiah ringkas
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden p-4 md:p-6 relative">
      
      {/* Ornamen Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#10b981]/5 to-transparent blur-[100px] pointer-events-none"></div>

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-[#f59e0b]" size={28} /> Top Whale Leaderboard
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Pantau peringkat investor dengan portofolio terverifikasi terbesar di platform.</p>
        </div>

        {/* Date Picker Button */}
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] rounded-lg text-sm font-bold text-neutral-300 transition-colors shadow-sm">
          <Calendar size={16} className="text-neutral-500" />
          {dateRange}
        </button>
      </div>

      {/* --- LEADERBOARD GRID --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10 pb-10 relative">
        
        {isLoading ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-500 mt-4 text-sm font-bold animate-pulse">Memuat data dari database...</p>
           </div>
        ) : traders.length === 0 ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
              <AlertCircle size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-bold">Belum ada Whale yang terverifikasi</p>
              <p className="text-sm mt-1">Data akan muncul setelah admin menyetujui aplikasi portofolio user.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {traders.map((trader, index) => {
              const rank = index + 1;
              const profile = Array.isArray(trader.profiles) ? trader.profiles[0] : trader.profiles;
              
              // Fallback nama dan avatar jika kosong
              const fullName = profile?.full_name || "Anonim Whale";
              const avatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e1e1e&color=10b981`;

              return (
                <div 
                  key={profile?.id || index} 
                  className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-5 flex items-center gap-6 hover:bg-[#1e1e1e] hover:border-[#3f3f46] transition-all group shadow-md"
                >
                  
                  {/* 1. Area Avatar & Nama */}
                  <div className="flex flex-col items-center justify-center shrink-0 relative w-24">
                    <div className="relative">
                      <div className={`relative w-16 h-16 rounded-full overflow-hidden border-2 shadow-lg ${rank === 1 ? 'border-[#f59e0b]' : rank === 2 ? 'border-[#94a3b8]' : rank === 3 ? 'border-[#b45309]' : 'border-[#2d2d2d]'}`}>
                        <Image 
                          src={avatar} 
                          alt={fullName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      {/* Badge Rank */}
                      <div className={`absolute -bottom-2 -right-2 w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-black border-2 border-[#121212] shadow-sm
                        ${rank === 1 ? 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-black scale-110' : 
                          rank === 2 ? 'bg-gradient-to-r from-[#94a3b8] to-[#cbd5e1] text-black' : 
                          rank === 3 ? 'bg-gradient-to-r from-[#b45309] to-[#d97706] text-white' : 
                          'bg-[#2d2d2d] text-white'}`}
                      >
                        #{rank}
                      </div>
                    </div>
                  </div>

                  {/* 2. Area Informasi Real */}
                  <div className="flex flex-col gap-2 shrink-0 flex-1">
                     <p className="text-white text-[15px] font-bold leading-tight">
                        {fullName}
                     </p>
                     <div className="flex flex-col gap-1 tabular-nums mt-1">
                        <div className="flex items-center text-[13px] bg-[#1e1e1e] px-3 py-1.5 rounded-lg border border-[#2d2d2d] w-fit">
                           <span className="text-neutral-400 font-medium mr-2">Estimasi Portofolio:</span>
                           <span className="text-[#10b981] font-black tracking-wide">{formatIDR(trader.estimated_balance)}</span>
                        </div>
                     </div>
                  </div>

                  {/* 3. Placeholder Info (Karena tabel Jurnal/Profit belum ada) */}
                  <div className="hidden sm:flex flex-col items-end justify-center text-right text-[11px] text-neutral-500 bg-[#1a1a1a] p-3 rounded-xl border border-[#2d2d2d]/50 border-dashed w-40">
                     <span className="font-bold mb-1 block">Fitur Jurnal Trading</span>
                     <span>Segera Hadir.</span>
                     <span className="text-[9px] mt-1 opacity-60">PnL Tracker butuh integrasi API sekuritas/Tabel SQL baru.</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
      
    </div>
  );
}