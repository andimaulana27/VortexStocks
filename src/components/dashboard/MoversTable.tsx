"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
// IMPORT STORE UNTUK OTAK UTAMA
import { useCompanyStore } from '@/store/useCompanyStore';

interface GoApiMoverItem {
  symbol: string; close: number; change: number; percent: number; company?: { name: string; logo?: string };
}

const mainMenus = ["Trending", "Movers"];
const moversTabs = ["Top Gainer", "Top Loser"];

const fetchMovers = async (keyArgs: [string, string, string]) => {
  const [, activeMenu, activeTab] = keyArgs; 
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  let endpoint = "trending";
  if (activeMenu === "Movers") endpoint = activeTab === "Top Loser" ? "top_loser" : "top_gainer"; 
  
  const response = await fetch(`https://api.goapi.io/stock/idx/${endpoint}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }});
  if (!response.ok) throw new Error("Gagal mengambil data market movers");
  const result = await response.json();
  if (result?.status === "success" && Array.isArray(result?.data?.results)) return result.data.results as GoApiMoverItem[];
  throw new Error("Format data tidak valid / Kosong");
};

export default function MoversTable() {
  const [activeMenu, setActiveMenu] = useState<string>("Trending");
  const [activeTab, setActiveTab] = useState<string>("Top Gainer");
  const [searchInput, setSearchInput] = useState<string>("");

  // PANGGIL STATE GLOBAL ZUSTAND
  const globalActiveSymbol = useCompanyStore(state => state.activeSymbol);
  const setGlobalActiveSymbol = useCompanyStore(state => state.setActiveSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);

  const { data: rawData, error, isLoading } = useSWR(['movers-data', activeMenu, activeTab], fetchMovers, { refreshInterval: 15000, dedupingInterval: 2000 });

  const stockData = useMemo(() => {
    if (!rawData) return [];
    return rawData.map((item) => {
      const sym = item.symbol || "-";
      const masterData = getCompany(sym);
      const cName = masterData?.name || item.company?.name || `PT ${sym} Tbk`; 
      const cLogo = masterData?.logo || item.company?.logo || `https://s3.goapi.io/logo/${sym}.jpg`;
      const rawClose = item.close || 0; const rawPct = item.percent || 0; const rawChange = item.change || 0;

      return {
        symbol: sym, companyName: cName, logoUrl: cLogo, price: rawClose.toLocaleString("id-ID"),
        changeStr: rawChange > 0 ? `+${rawChange}` : `${rawChange}`, percentStr: rawPct > 0 ? `+${rawPct.toFixed(2)}%` : `${rawPct.toFixed(2)}%`,
        percentRaw: rawPct, isUp: rawChange >= 0, 
      };
    });
  }, [rawData, getCompany]);

  // Handler Pencarian Saham dari Semua Market
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setGlobalActiveSymbol(searchInput.trim().toUpperCase());
      setSearchInput(""); // Kosongkan input setelah mencari
    }
  };

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-lg flex flex-col h-full overflow-hidden shadow-lg relative">
      
      {/* HEADER MENU UTAMA */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-[#2d2d2d] shrink-0 bg-[#121212] h-[40px]">
        {mainMenus.map((menu) => (
          <button
            key={menu}
            onClick={() => { setActiveMenu(menu); if (menu === "Trending") setActiveTab("Top Gainer"); }}
            className={`whitespace-nowrap px-4 h-full text-[12px] font-bold transition-colors border-b-2 ${activeMenu === menu ? "text-white border-white bg-[#1e1e1e]" : "text-neutral-500 border-transparent hover:text-neutral-300"}`}
          >
            {menu}
          </button>
        ))}
      </div>

      {/* SEARCH BAR GLOBAL + SUB-MENU */}
      <div className="flex flex-col shrink-0 border-b border-[#2d2d2d] bg-[#121212]">
        
        {/* Kotak Pencarian agar semua Saham All Market bisa dicari dan dikirim ke Widget lain */}
        <div className="p-2 border-b border-[#2d2d2d]/50 bg-[#18181b]/30">
          <form onSubmit={handleSearchSubmit} className="flex items-center bg-[#1e1e1e] border border-[#2d2d2d] rounded px-2 py-1.5 focus-within:border-[#10b981] transition-colors shadow-inner">
            <Search size={14} className="text-neutral-500 mr-2 shrink-0" />
            <input 
              type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="CARI SAHAM (EX: BBCA)..."
              className="bg-transparent text-[#10b981] font-bold outline-none w-full placeholder-neutral-600 uppercase text-[10px]" maxLength={4}
            />
          </form>
        </div>

        {activeMenu === "Movers" && (
          <div className="flex overflow-x-auto hide-scrollbar h-[36px]">
            {moversTabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-4 h-full text-[11px] font-bold transition-colors border-b-2 flex items-center justify-center ${activeTab === tab ? "text-[#10b981] border-[#10b981] bg-[#1e1e1e]" : "text-neutral-500 border-transparent hover:text-neutral-300"}`}>{tab}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-[#121212] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 shrink-0 sticky top-0 z-20">
        <div className="col-span-2">Saham</div>
        <div className="col-span-1 text-right">Price</div>
        <div className="col-span-1 text-right">Change</div>
        <div className="col-span-1 text-right">Percent</div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-1 pb-24 relative">
        {isLoading && stockData.length > 0 && <div className="absolute top-2 right-4 z-[100] flex items-center gap-1.5 text-[#10b981] text-[9px] font-bold animate-pulse"><div className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></div> Syncing</div>}

        {isLoading && stockData.length === 0 ? (
          <div className="flex justify-center items-center h-full text-[#10b981] text-xs font-bold animate-pulse">Menarik Data Live...</div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-[#ef4444] text-xs px-4 text-center font-medium">{error.message}</div>
        ) : stockData.length === 0 ? (
          <div className="flex justify-center items-center h-full text-neutral-500 text-xs">Tidak ada data.</div>
        ) : (
          stockData.map((row, idx) => (
            
            // FUNGSI ONCLICK GLOBAL: Saat baris di-klik, Update Otak Utama!
            <div 
              key={idx} 
              onClick={() => setGlobalActiveSymbol(row.symbol)}
              className={`grid grid-cols-5 gap-2 px-3 py-2.5 text-[11px] font-medium hover:bg-[#1e1e1e] hover:z-50 rounded-md transition-all duration-200 items-center cursor-pointer group relative ${globalActiveSymbol === row.symbol ? 'bg-[#1e1e1e] border-l-2 border-[#10b981] shadow-inner' : 'border-l-2 border-transparent'}`}
            >
              <div className="col-span-2 flex items-center space-x-2 overflow-visible">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.logoUrl} alt={row.symbol} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }} />
                </div>
                <div className="flex flex-col justify-center truncate">
                  <span className={`font-bold tracking-wide border-b border-dashed pb-[1px] w-max transition-colors relative cursor-help ${globalActiveSymbol === row.symbol ? 'text-[#10b981] border-[#10b981]' : 'text-white border-neutral-600 group-hover:border-white group-hover:text-[#10b981]'}`}>
                    {row.symbol}
                    <div className="absolute left-2 top-full mt-2 hidden group-hover:flex w-max max-w-[220px] flex-col items-start bg-[#1e1e1e] border border-neutral-600 text-white text-[10px] px-3 py-2 rounded-md shadow-[0_12px_30px_rgba(0,0,0,0.8)] z-[999] animate-in fade-in zoom-in duration-200">
                      <span className="text-neutral-400 font-normal mb-1">Nama Perusahaan:</span><span className="font-bold whitespace-normal leading-relaxed">{row.companyName}</span>
                    </div>
                  </span>
                  <span className="text-neutral-500 text-[9px] truncate mt-0.5 max-w-[75px]" title={row.companyName}>{row.companyName}</span>
                </div>
              </div>
              <div className="col-span-1 text-right text-white font-semibold tabular-nums flex flex-col justify-center">{row.price}</div>
              <div className={`col-span-1 text-right font-bold tabular-nums flex flex-col justify-center ${row.isUp ? "text-[#10b981]" : "text-[#ef4444]"}`}>{row.changeStr}</div>
              <div className="col-span-1 flex justify-end items-center tabular-nums">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.isUp ? "bg-[#10b981]/15 text-[#10b981]" : "bg-[#ef4444]/15 text-[#ef4444]"}`}>{row.percentStr}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}