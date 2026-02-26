"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

// INTERFACE YANG KINI DIPAKAI SEPENUHNYA
interface MappedCalendarItem {
  symbol: string; 
  companyName: string; 
  logoUrl: string; 
  status: string;
  priceStr: string; 
  bookBuildingStr: string; 
  offeringStr: string; 
  listingStr: string;
}

interface GoApiIPOItem {
  ticker?: string; symbol?: string; name?: string; company_name?: string; status?: string;
  price?: string | number; final_price?: string | number; price_range?: string | number;
  book_building_start_date?: string; book_building_end_date?: string; book_building_start?: string; book_building_end?: string;
  bookbuilding_start_date?: string; bookbuilding_end_date?: string; bb_start?: string; bb_end?: string;
  offering_start_date?: string; offering_end_date?: string; offering_start?: string; offering_end?: string;
  offer_start?: string; offer_end?: string;
  listing_date?: string; tentative_listing_date?: string; ipo_date?: string;
}

const tabs = ["IPO (e-IPO)"];

const formatIPOPrice = (val?: string | number): string => {
  if (val === undefined || val === null || String(val).trim() === "" || val === "-" || val === 0 || val === "0") return "TBA";
  if (typeof val === "number") return `Rp ${val.toLocaleString("id-ID")}`;
  const strVal = String(val).trim();
  if (strVal.includes("-")) return strVal.toLowerCase().includes("rp") ? strVal : `Rp ${strVal}`;
  const numVal = Number(strVal);
  if (!isNaN(numVal)) return `Rp ${numVal.toLocaleString("id-ID")}`;
  return strVal;
};

const extractValidDate = (...dates: (string | undefined)[]): string | undefined => {
  for (const d of dates) {
    if (d && String(d).trim() !== "" && String(d) !== "-" && String(d) !== "0000-00-00") return String(d).trim();
  }
  return undefined;
};

const formatDateRange = (start?: string, end?: string): string => {
  if (start && end) return `${start} s/d ${end}`;
  if (start) return start;
  if (end) return `s/d ${end}`;
  return "TBA";
};

// Auto-Pagination Fetcher untuk SWR
const fetchAllIpo = async () => {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  let allRawData: GoApiIPOItem[] = [];
  let currentPage = 1;
  let hasMoreData = true;
  
  while (hasMoreData && currentPage <= 5) {
    const res = await fetch(`https://api.goapi.io/stock/idx/e-ipo?page=${currentPage}&limit=100`, { 
      headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } 
    });
    if (!res.ok) throw new Error("Gagal mengambil data IPO");
    const json = await res.json();
    if (json?.status === "success" && Array.isArray(json?.data?.results) && json.data.results.length > 0) {
      allRawData = [...allRawData, ...json.data.results];
      currentPage++; 
      if (json.data.results.length < 100) hasMoreData = false;
    } else {
      hasMoreData = false;
    }
  }
  if (allRawData.length === 0) throw new Error("Tidak ada data E-IPO saat ini.");
  return allRawData;
};

export default function CalendarTable() {
  const [activeTab, setActiveTab] = useState<string>("IPO (e-IPO)");
  
  // Ambil Data Master Perusahaan
  const getCompany = useCompanyStore(state => state.getCompany);

  const { data: rawIpoData, error, isLoading } = useSWR('e-ipo-all', fetchAllIpo, { 
    refreshInterval: 3600000, dedupingInterval: 60000 
  });

  // FIX: Type parameter <MappedCalendarItem[]> disematkan, jadi interface tidak menganggur
  const calendarData = useMemo<MappedCalendarItem[]>(() => {
    if (!rawIpoData) return [];
    
    return rawIpoData.map((item) => {
      const sym = item.ticker ?? item.symbol ?? "-";
      
      const masterData = getCompany(sym);
      const cName = masterData?.name || item.name || item.company_name || "TBA";
      const logoUrl = masterData?.logo || `https://s3.goapi.io/logo/${sym}.jpg`;
      
      const stat = item.status ?? "Unknown";
      const priceStr = formatIPOPrice(item.final_price ?? item.price ?? item.price_range);
      
      const bbStart = extractValidDate(item.book_building_start_date, item.bookbuilding_start_date, item.book_building_start, item.bb_start);
      const bbEnd = extractValidDate(item.book_building_end_date, item.bookbuilding_end_date, item.book_building_end, item.bb_end);
      const offStart = extractValidDate(item.offering_start_date, item.offering_start, item.offer_start);
      const offEnd = extractValidDate(item.offering_end_date, item.offering_end, item.offer_end);
      const listDate = extractValidDate(item.listing_date, item.tentative_listing_date, item.ipo_date) ?? "TBA";

      return {
        symbol: sym,
        companyName: cName,
        logoUrl: logoUrl,
        status: stat,
        priceStr,
        bookBuildingStr: formatDateRange(bbStart, bbEnd),
        offeringStr: formatDateRange(offStart, offEnd),
        listingStr: listDate,
      };
    });
  }, [rawIpoData, getCompany]);

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-lg flex flex-col h-full overflow-hidden shadow-lg relative">
      <div className="px-4 py-3 border-b border-[#2d2d2d] bg-[#121212] shrink-0 flex justify-between items-center">
        <h2 className="text-white text-sm font-bold tracking-wide">Market Calendar</h2>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar border-b border-[#2d2d2d] shrink-0 bg-[#121212]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-2 text-[11px] font-bold transition-colors ${
              activeTab === tab ? "text-[#10b981] border-b-2 border-[#10b981] bg-[#1e1e1e]" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-[#121212] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 shrink-0 sticky top-0 z-20">
        <div className="col-span-1">Symbol</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1 text-right">Price</div>
        <div className="col-span-1 text-center">Book Building</div>
        <div className="col-span-1 text-center">Offering</div>
        <div className="col-span-1 text-right">Listing Date</div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-1 pb-24 relative">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full text-[#10b981] text-xs font-bold animate-pulse space-y-2">
            <span>Menyedot Seluruh Data E-IPO Live...</span>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-[#ef4444] text-xs px-4 text-center font-medium">
            {/* FIX: Memastikan variabel error digunakan dengan aman secara tipe data */}
            {error instanceof Error ? error.message : "Terjadi kesalahan API"}
          </div>
        ) : calendarData.length === 0 ? (
          <div className="flex justify-center items-center h-full text-neutral-500 text-xs">
            Tidak ada saham IPO saat ini.
          </div>
        ) : (
          calendarData.map((row, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 px-3 py-2.5 text-[11px] font-medium hover:bg-[#1e1e1e] hover:z-50 rounded-md transition-colors items-center group cursor-pointer relative">
              <div className="col-span-1 flex items-center space-x-2 overflow-visible">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.logoUrl} alt={row.symbol} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }} />
                </div>
                <span className="text-white font-bold tracking-wide border-b border-dashed border-neutral-600 pb-[1px] group-hover:border-white group-hover:text-[#10b981] transition-colors relative w-max cursor-help">
                  {row.symbol}
                  <div className="absolute left-2 top-full mt-2 hidden group-hover:flex w-max max-w-[220px] flex-col items-start bg-[#1e1e1e] border border-neutral-600 text-white text-[10px] px-3 py-2 rounded-md shadow-[0_12px_30px_rgba(0,0,0,0.8)] z-[999] animate-in fade-in zoom-in duration-200">
                    <span className="text-neutral-400 font-normal mb-1">Nama Perusahaan:</span>
                    <span className="font-bold whitespace-normal leading-relaxed">{row.companyName}</span>
                    <div className="absolute -top-1.5 left-3 w-2.5 h-2.5 bg-[#1e1e1e] border-t border-l border-neutral-600 transform rotate-45"></div>
                  </div>
                </span>
              </div>
              <div className="col-span-1 flex items-center">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${row.status.toLowerCase().includes("book") ? "bg-blue-500/15 text-blue-500" : row.status.toLowerCase().includes("offering") ? "bg-[#10b981]/15 text-[#10b981]" : "bg-orange-500/15 text-orange-500"}`}>{row.status}</span>
              </div>
              <div className="col-span-1 text-right text-white font-semibold whitespace-nowrap">{row.priceStr}</div>
              <div className="col-span-1 text-center text-neutral-400 text-[9px] leading-tight">{row.bookBuildingStr}</div>
              <div className="col-span-1 text-center text-neutral-400 text-[9px] leading-tight">{row.offeringStr}</div>
              <div className="col-span-1 text-right text-[#10b981] font-bold">{row.listingStr}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}