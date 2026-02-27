"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { X, Plus, Search } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA API ---
interface GoApiPrice {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  change_pct: number;
  volume: number;
}

interface GoApiProfile {
  symbol: string;
  name: string;
  logo: string;
  outstanding_shares: number;
  ipo_offering_price: number;
  ipo_fund_raised: number;
  ipo_listing_date: string;
  sector_name: string;
  industry_name: string;
  status: string;
  shareholders: Array<{ name: string; percentage: string }>;
}

// --- HELPER FORMATTING ---
const formatShortNum = (num?: number) => {
  if (!num) return "-";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  return num.toLocaleString('id-ID');
};

const formatPrice = (num?: number) => {
  if (!num) return "-";
  return num.toLocaleString('id-ID');
};

// --- PALET WARNA KOLOM ---
const COLUMN_THEMES = [
  { border: "border-t-[#10b981]", bg: "bg-[#10b981]/[0.03]" }, 
  { border: "border-t-[#0ea5e9]", bg: "bg-[#0ea5e9]/[0.03]" }, 
  { border: "border-t-[#a855f7]", bg: "bg-[#a855f7]/[0.03]" }, 
  { border: "border-t-[#f59e0b]", bg: "bg-[#f59e0b]/[0.03]" }, 
  { border: "border-t-[#ec4899]", bg: "bg-[#ec4899]/[0.03]" }, 
  { border: "border-t-[#f43f5e]", bg: "bg-[#f43f5e]/[0.03]" }, 
  { border: "border-t-[#14b8a6]", bg: "bg-[#14b8a6]/[0.03]" }, 
  { border: "border-t-[#8b5cf6]", bg: "bg-[#8b5cf6]/[0.03]" }, 
  { border: "border-t-[#f97316]", bg: "bg-[#f97316]/[0.03]" }, 
  { border: "border-t-[#6366f1]", bg: "bg-[#6366f1]/[0.03]" }, 
];

export default function FundamentalComparisonPanel({ initialSymbol }: { initialSymbol: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const allCompanies = useCompanyStore(state => state.companies);

  // STATE: Daftar Saham
  const [symbols, setSymbols] = useState<string[]>([initialSymbol]);
  const [searchQ, setSearchQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [prevInitial, setPrevInitial] = useState(initialSymbol);
  if (initialSymbol !== prevInitial) {
    setPrevInitial(initialSymbol);
    if (!symbols.includes(initialSymbol)) {
      setSymbols([initialSymbol, ...symbols.filter(s => s !== initialSymbol)].slice(0, 10));
    }
  }

  // 1. FETCH SEMUA HARGA SEKALIGUS (1 Call Sangat Cepat)
  const symbolsQuery = symbols.join(',');
  const { data: pricesRes, isLoading: loadPrices } = useSWR(
    symbols.length > 0 ? `comp-prices-${symbolsQuery}` : null,
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${symbolsQuery}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 5000 }
  );

  // 2. FETCH PROFIL MASING-MASING SAHAM
  const { data: profilesMap, isLoading: loadProfiles } = useSWR(
    symbols.length > 0 ? `comp-profiles-${symbolsQuery}` : null,
    async () => {
      const promises = symbols.map(sym =>
        fetch(`https://api.goapi.io/stock/idx/${sym}/profile`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } })
          .then(res => res.json())
          .then(data => ({ symbol: sym, profile: data.data as GoApiProfile }))
          .catch(() => ({ symbol: sym, profile: null }))
      );
      const results = await Promise.all(promises);
      const map: Record<string, GoApiProfile | null> = {};
      results.forEach(res => { map[res.symbol] = res.profile; });
      return map;
    },
    { dedupingInterval: 60000 }
  );

  const priceMap: Record<string, GoApiPrice> = useMemo(() => {
    const map: Record<string, GoApiPrice> = {};
    if (pricesRes?.data?.results) {
      pricesRes.data.results.forEach((p: GoApiPrice) => { map[p.symbol] = p; });
    }
    return map;
  }, [pricesRes]);

  const isLoading = loadPrices || loadProfiles;

  // HANDLER ADD & REMOVE
  const handleAddSymbol = (sym: string) => {
    const cleanSym = sym.toUpperCase().trim();
    if (cleanSym && symbols.length < 10 && !symbols.includes(cleanSym)) {
      setSymbols([...symbols, cleanSym]);
    }
    setSearchQ("");
    setIsSearching(false);
  };

  const handleRemoveSymbol = (sym: string) => {
    setSymbols(symbols.filter(s => s !== sym));
  };

  // SEARCH SUGGESTIONS LOGIC DENGAN PENGAMANAN (Safety Check)
  const searchResults = useMemo(() => {
    if (!searchQ) return [];
    const q = searchQ.toUpperCase();
    return Object.values(allCompanies)
      .filter(c => c.symbol.includes(q) || (c.name && c.name.toUpperCase().includes(q)))
      .slice(0, 5); 
  }, [searchQ, allCompanies]);

  const CATEGORIES = [
    {
      title: "Market Action",
      rows: [
        { label: "Last Price", render: (sym: string) => priceMap[sym]?.close ? `Rp ${formatPrice(priceMap[sym].close)}` : "-", isBold: true, color: "text-white" },
        { label: "Change", render: (sym: string) => {
            const p = priceMap[sym];
            if (!p) return "-";
            const isUp = p.change >= 0;
            return <span className={isUp ? "text-[#10b981]" : "text-[#ef4444]"}>{isUp ? '+' : ''}{p.change}</span>;
        }},
        { label: "Change (%)", render: (sym: string) => {
            const p = priceMap[sym];
            if (!p) return "-";
            const isUp = p.change >= 0;
            return <span className={isUp ? "text-[#10b981]" : "text-[#ef4444]"}>{isUp ? '+' : ''}{p.change_pct.toFixed(2)}%</span>;
        }},
        { label: "Open Price", render: (sym: string) => priceMap[sym]?.open ? formatPrice(priceMap[sym].open) : "-" },
        { label: "High Price", render: (sym: string) => priceMap[sym]?.high ? <span className="text-[#10b981]">{formatPrice(priceMap[sym].high)}</span> : "-" },
        { label: "Low Price", render: (sym: string) => priceMap[sym]?.low ? <span className="text-[#ef4444]">{formatPrice(priceMap[sym].low)}</span> : "-" },
        { label: "Volume", render: (sym: string) => formatShortNum(priceMap[sym]?.volume) },
        { label: "Turnover Est.", render: (sym: string) => priceMap[sym]?.close && priceMap[sym]?.volume ? `Rp ${formatShortNum(priceMap[sym].close * priceMap[sym].volume)}` : "-" },
      ]
    },
    {
      title: "Valuation & Structure",
      rows: [
        { label: "Market Cap", render: (sym: string) => {
           const p = priceMap[sym]?.close;
           const s = profilesMap?.[sym]?.outstanding_shares;
           if (p && s) return <span className="text-white font-bold">Rp {formatShortNum(p * s)}</span>;
           return "-";
        }},
        { label: "Outstanding Shares", render: (sym: string) => profilesMap?.[sym]?.outstanding_shares ? `${formatShortNum(profilesMap[sym]!.outstanding_shares)}` : "-" },
        { label: "IPO Price", render: (sym: string) => profilesMap?.[sym]?.ipo_offering_price ? `Rp ${formatPrice(profilesMap[sym]!.ipo_offering_price)}` : "-" },
        { label: "Fund Raised", render: (sym: string) => profilesMap?.[sym]?.ipo_fund_raised ? `Rp ${formatShortNum(profilesMap[sym]!.ipo_fund_raised)}` : "-" },
        { label: "Listing Date", render: (sym: string) => profilesMap?.[sym]?.ipo_listing_date || "-" },
      ]
    },
    {
      title: "Profile & Ownership",
      rows: [
        { label: "Sector", render: (sym: string) => <span className="truncate w-full px-2 inline-block text-center">{profilesMap?.[sym]?.sector_name || "-"}</span> },
        { label: "Industry", render: (sym: string) => <span className="truncate w-full px-2 inline-block text-center">{profilesMap?.[sym]?.industry_name || "-"}</span> },
        { label: "Status", render: (sym: string) => {
            const status = profilesMap?.[sym]?.status;
            if (!status) return "-";
            return <span className={status === "LISTED" ? "text-[#10b981]" : "text-[#ef4444]"}>{status}</span>;
        }},
        { label: "Top Shareholder", render: (sym: string) => {
            const sh = profilesMap?.[sym]?.shareholders?.[0];
            return sh ? <span className="truncate w-full px-2 inline-block text-center text-white" title={sh.name}>{sh.name}</span> : "-";
        }},
        { label: "Ownership %", render: (sym: string) => {
            const sh = profilesMap?.[sym]?.shareholders?.[0];
            return sh ? <span className="text-[#f59e0b] font-bold">{sh.percentage}%</span> : "-";
        }},
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] relative font-sans">
      
      {isLoading && (
         <div className="absolute top-0 left-0 right-0 h-1 bg-[#121212] z-50 overflow-hidden">
            <div className="h-full bg-[#10b981] animate-pulse w-1/3"></div>
         </div>
      )}

      {/* TOOLBAR */}
      <div className="flex justify-between items-center p-4 border-b border-[#2d2d2d] bg-[#121212] shrink-0 z-30">
         <span className="text-white text-[14px] font-bold tracking-widest uppercase flex items-center gap-3">
            Comparison <span className="bg-[#121212] text-neutral-400 px-3 py-1 rounded-full text-[11px] border border-[#2d2d2d]">{symbols.length} / 10 Stocks</span>
         </span>
         <span className="text-neutral-500 text-[11px] font-medium hidden md:inline-block tracking-wider uppercase">
            Real-time GoAPI Metric Engine
         </span>
      </div>

      {/* TABLE AREA */}
      <div className="flex-1 overflow-auto hide-scrollbar bg-[#121212] relative">
         <div className="flex min-w-full pb-10">
            
            {/* COLUMN 0: FIXED METRIC LABELS */}
            <div className="w-[260px] shrink-0 sticky left-0 z-20 bg-[#121212] border-r border-[#2d2d2d] shadow-[4px_0_15px_rgba(0,0,0,0.3)]">
               <div className="h-[110px] border-b border-[#2d2d2d] bg-[#121212]"></div>
               {CATEGORIES.map((cat, cIdx) => (
                 <div key={`cat-${cIdx}`}>
                   <div className="h-10 flex items-end px-5 pb-2 border-b border-[#2d2d2d] bg-[#121212]">
                      <span className="text-neutral-500 text-[11px] font-black uppercase tracking-widest">{cat.title}</span>
                   </div>
                   {cat.rows.map((row, rIdx) => (
                     <div key={`row-${cIdx}-${rIdx}`} className="h-12 px-5 flex items-center border-b border-[#2d2d2d]/30 text-[13px] text-neutral-400 hover:text-white transition-colors cursor-default">
                        {row.label}
                     </div>
                   ))}
                 </div>
               ))}
            </div>

            {/* DYNAMIC COLUMNS: EACH SELECTED STOCK */}
            {symbols.map((sym, idx) => {
               const theme = COLUMN_THEMES[idx % COLUMN_THEMES.length];

               return (
                 <div key={sym} className={`flex-1 min-w-[180px] shrink-0 border-r border-[#2d2d2d] flex flex-col group transition-colors ${theme.bg}`}>
                    <div className={`h-[110px] border-b border-[#2d2d2d] border-t-[4px] ${theme.border} flex flex-col items-center justify-center p-3 relative bg-[#121212]`}>
                       <button 
                         onClick={() => handleRemoveSymbol(sym)}
                         className="absolute top-2 right-2 p-1 text-neutral-600 hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                          <X size={16} />
                       </button>
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img 
                         src={profilesMap?.[sym]?.logo || `https://s3.goapi.io/logo/${sym}.jpg`} 
                         alt={sym} 
                         className="w-11 h-11 rounded-lg bg-white p-1 object-contain mb-2 border border-[#2d2d2d]"
                         onError={(e) => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}
                       />
                       <span className="text-white font-black text-[16px] tracking-wider">{sym}</span>
                    </div>

                    {CATEGORIES.map((cat, cIdx) => (
                      <div key={`data-cat-${cIdx}`}>
                        <div className="h-10 border-b border-[#2d2d2d]"></div> 
                        {cat.rows.map((row, rIdx) => (
                          <div 
                            key={`data-row-${cIdx}-${rIdx}`} 
                            className={`h-12 px-2 flex items-center justify-center border-b border-[#2d2d2d]/30 text-[13px] tabular-nums text-center hover:bg-[#1e1e1e]/40 transition-colors ${row.isBold ? 'font-bold' : 'font-medium'} ${row.color || 'text-neutral-300'}`}
                          >
                             {row.render(sym)}
                          </div>
                        ))}
                      </div>
                    ))}
                 </div>
               );
            })}

            {/* ADD COLUMN DENGAN FIX ENTER KEY */}
            {symbols.length < 10 && (
               <div className="flex-1 min-w-[180px] shrink-0 flex flex-col relative bg-[#121212]">
                  <div className="h-[110px] border-b border-[#2d2d2d] flex flex-col items-center justify-center p-4 relative">
                     {isSearching ? (
                        <div className="w-full relative px-2">
                           <div className="flex items-center border border-[#10b981] rounded px-3 py-2 bg-[#1e1e1e]">
                              <Search size={14} className="text-[#10b981] mr-2 shrink-0" />
                              <input 
                                autoFocus
                                type="text"
                                value={searchQ}
                                onChange={(e) => setSearchQ(e.target.value)}
                                onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                                // FIX: Menangkap tombol Enter agar langsung tertambah tanpa perlu klik dropdown!
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && searchQ.trim()) {
                                    handleAddSymbol(searchQ);
                                  }
                                }}
                                placeholder="Symbol..."
                                className="bg-transparent outline-none w-full text-[13px] text-white uppercase font-bold placeholder-neutral-600"
                              />
                           </div>
                           
                           {/* Search Suggestions */}
                           {searchQ && (
                             <div className="absolute top-full left-2 right-2 mt-1 bg-[#1e1e1e] border border-[#2d2d2d] rounded shadow-xl z-50 max-h-48 overflow-y-auto hide-scrollbar">
                               {searchResults.length > 0 ? (
                                 searchResults.map(c => (
                                   <div 
                                     key={c.symbol} 
                                     onClick={() => handleAddSymbol(c.symbol)}
                                     className="px-3 py-2.5 hover:bg-[#2d2d2d] cursor-pointer text-[12px] text-white flex flex-col border-b border-[#2d2d2d]/50 last:border-0"
                                   >
                                     <span className="font-bold">{c.symbol}</span>
                                     <span className="text-[10px] text-neutral-500 truncate">{c.name}</span>
                                   </div>
                                 ))
                               ) : (
                                 <div className="px-3 py-3 text-[11px] text-neutral-500 text-center">Press Enter to Add</div>
                               )}
                             </div>
                           )}
                        </div>
                     ) : (
                        <button 
                           onClick={() => setIsSearching(true)}
                           className="w-14 h-14 rounded-full border border-dashed border-[#2d2d2d] flex flex-col items-center justify-center text-neutral-500 hover:text-[#10b981] hover:border-[#10b981] hover:bg-[#10b981]/10 transition-all"
                        >
                           <Plus size={24} />
                           <span className="text-[10px] font-bold mt-1">ADD</span>
                        </button>
                     )}
                  </div>
                  
                  {CATEGORIES.map((cat, cIdx) => (
                     <div key={`add-cat-${cIdx}`}>
                        <div className="h-10 border-b border-[#2d2d2d]"></div>
                        {cat.rows.map((_, rIdx) => (
                           <div key={`add-row-${cIdx}-${rIdx}`} className="h-12 border-b border-[#2d2d2d]/30"></div>
                        ))}
                     </div>
                  ))}
               </div>
            )}

         </div>
      </div>
    </div>
  );
}